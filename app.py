"""
Radiomed — Automated Medical Image Diagnosis Assistant.
Flask app entry point with all routes (auth, diagnose, scans, delete, settings).
"""
from __future__ import annotations

import os
import re
import io
import base64
import secrets
from pathlib import Path
from datetime import datetime, timezone

from flask import Flask, request, jsonify, send_file, send_from_directory, g
from flask_cors import CORS
from PIL import Image

from database import (
    init_db, insert_user, fetch_user_by_email, fetch_user_by_id, delete_user,
    upsert_patient, insert_scan, update_scan_report, fetch_scan,
    fetch_scans_by_clinician, delete_scan, delete_all_scans, fetch_dashboard_stats,
)
from database.db import _conn
from auth import hash_password, verify_password, issue_token, verify_token
from inference import run_inference, get_model_status
from report import generate_report

BASE_DIR = Path(__file__).resolve().parent
UPLOADS_DIR = BASE_DIR / "static" / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_MODALITIES = {"MRI", "X-Ray", "CT"}

app = Flask(__name__, static_folder=str(BASE_DIR / "static"),
            template_folder=str(BASE_DIR / "templates"))
CORS(app, supports_credentials=True)


def bootstrap():
    init_db()
    if not fetch_user_by_email("demo@radiomed.ai"):
        insert_user(email="demo@radiomed.ai", name="Dr. Maya Costache",
                    password_hash=hash_password("radiomed123"), role="clinician")


def _bearer_user():
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    token = auth[7:].strip()
    payload = verify_token(token)
    if not payload:
        return None
    user = fetch_user_by_id(payload["sub"])
    if not user:
        return None
    g.user = user
    g.user_id = user["id"]
    return user


def auth_required(fn):
    from functools import wraps
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not _bearer_user():
            return jsonify({"error": "unauthorized", "message": "Authentication required"}), 401
        return fn(*args, **kwargs)
    return wrapper


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------
@app.post("/api/auth/register")
def api_register():
    data = request.get_json(force=True, silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    name = (data.get("name") or "").strip()
    password = data.get("password") or ""
    role = (data.get("role") or "clinician").strip().lower() or "clinician"
    if not email or not name or not password:
        return jsonify({"error": "invalid_input", "message": "email, name, password required"}), 400
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        return jsonify({"error": "invalid_email", "message": "Please enter a valid email address."}), 400
    if len(password) < 8:
        return jsonify({"error": "weak_password", "message": "Password must be at least 8 characters."}), 400
    if fetch_user_by_email(email):
        return jsonify({"error": "email_taken", "message": "An account with this email already exists."}), 409
    uid = insert_user(email=email, name=name, password_hash=hash_password(password), role=role)
    token = issue_token(uid, email, name, role)
    return jsonify({"token": token, "user": {"id": uid, "email": email, "name": name, "role": role}}), 201


@app.post("/api/auth/login")
def api_login():
    data = request.get_json(force=True, silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    if not email or not password:
        return jsonify({"error": "invalid_input", "message": "Email and password are required."}), 400
    user = fetch_user_by_email(email)
    if not user or not verify_password(password, user["password_hash"]):
        return jsonify({"error": "invalid_credentials", "message": "Incorrect email or password."}), 401
    token = issue_token(user["id"], user["email"], user["name"], user["role"])
    return jsonify({"token": token, "user": {"id": user["id"], "email": user["email"],
                                              "name": user["name"], "role": user["role"]}})


@app.get("/api/auth/me")
@auth_required
def api_me():
    u = g.user
    return jsonify({"id": u["id"], "email": u["email"], "name": u["name"], "role": u["role"]})


@app.delete("/api/auth/account")
@auth_required
def api_delete_account():
    uid = g.user_id
    cur = _conn().cursor()
    cur.execute("SELECT filename, gradcam_path, gradcam_solid_path, report_path FROM scans WHERE clinician_id=?", (uid,))
    rows = cur.fetchall()
    cur.close()
    for row in rows:
        for col in ["filename", "gradcam_path", "gradcam_solid_path"]:
            v = row[col]
            if v:
                p = UPLOADS_DIR.parent / v
                try:
                    if p.exists():
                        p.unlink()
                except Exception:
                    pass
        if row["report_path"]:
            try:
                rp = Path(row["report_path"])
                if rp.exists():
                    rp.unlink()
            except Exception:
                pass
    delete_user(uid)
    return jsonify({"deleted": True})


# ---------------------------------------------------------------------------
# Model status
# ---------------------------------------------------------------------------
@app.get("/api/models/status")
@auth_required
def api_model_status():
    return jsonify(get_model_status())


# ---------------------------------------------------------------------------
# Patient code auto-generation
# ---------------------------------------------------------------------------
@app.get("/api/patients/next-code")
@auth_required
def api_next_patient_code():
    year = datetime.now(timezone.utc).year
    cur = _conn().cursor()
    cur.execute("SELECT patient_code FROM scans WHERE clinician_id=? AND patient_code LIKE ?",
                (g.user_id, f"RM-{year}-%"))
    max_n = 0
    for (code,) in cur.fetchall():
        m = re.match(rf"^RM-{year}-(\d+)$", code or "")
        if m:
            max_n = max(max_n, int(m.group(1)))
    cur.close()
    return jsonify({"code": f"RM-{year}-{max_n + 1:04d}"})


def _gen_patient_code(clinician_id):
    year = datetime.now(timezone.utc).year
    cur = _conn().cursor()
    cur.execute("SELECT patient_code FROM scans WHERE clinician_id=? AND patient_code LIKE ?",
                (clinician_id, f"RM-{year}-%"))
    max_n = 0
    for (code,) in cur.fetchall():
        m = re.match(rf"^RM-{year}-(\d+)$", code or "")
        if m:
            max_n = max(max_n, int(m.group(1)))
    cur.close()
    return f"RM-{year}-{max_n + 1:04d}"


# ---------------------------------------------------------------------------
# Diagnose
# ---------------------------------------------------------------------------
@app.post("/api/diagnose")
@auth_required
def api_diagnose():
    if "image" not in request.files:
        return jsonify({"error": "missing_image", "message": "Please select an image file."}), 400
    file = request.files["image"]
    if not file.filename:
        return jsonify({"error": "missing_image", "message": "Please select an image file."}), 400

    modality = (request.form.get("modality") or "").strip()
    if modality not in ALLOWED_MODALITIES:
        return jsonify({"error": "invalid_modality", "message": "Modality must be MRI, X-Ray, or CT."}), 400

    patient_code = (request.form.get("patient_code") or "").strip()
    if not patient_code:
        patient_code = _gen_patient_code(g.user_id)
    patient_name = (request.form.get("patient_name") or "").strip() or None

    age_raw = (request.form.get("age") or "").strip()
    sex_raw = (request.form.get("sex") or "").strip().lower()
    try:
        age = int(age_raw) if age_raw else None
        if age is not None and (age < 0 or age > 130):
            raise ValueError()
    except ValueError:
        return jsonify({"error": "invalid_age", "message": "Age must be 0–130."}), 400
    if sex_raw and sex_raw not in {"male", "female", "other"}:
        return jsonify({"error": "invalid_sex", "message": "Sex must be male, female, or other."}), 400
    sex = sex_raw if sex_raw else None

    img_bytes = file.read()
    if not img_bytes:
        return jsonify({"error": "empty_image", "message": "Uploaded image is empty."}), 400
    try:
        pil_image = Image.open(io.BytesIO(img_bytes))
    except Exception:
        return jsonify({"error": "invalid_image", "message": "Could not read image. Upload a valid PNG/JPG."}), 400

    safe_ext = os.path.splitext(file.filename)[1].lower() or ".png"
    if safe_ext not in {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff"}:
        safe_ext = ".png"
    saved_filename = f"{secrets.token_hex(10)}{safe_ext}"
    saved_path = UPLOADS_DIR / saved_filename
    pil_image.save(saved_path)

    try:
        result = run_inference(pil_image, modality)
    except FileNotFoundError as e:
        return jsonify({"error": "model_missing", "message": str(e)}), 503
    except Exception as e:
        return jsonify({"error": "inference_failed", "message": f"Inference error: {str(e)}"}), 500

    gradcam_path = None
    gradcam_solid_path = None
    if result.get("gradcam_b64"):
        try:
            gb = base64.b64decode(result["gradcam_b64"])
            gn = f"gradcam_{Path(saved_filename).stem}.png"
            gp = str(UPLOADS_DIR / gn)
            with open(gp, "wb") as f:
                f.write(gb)
            gradcam_path = f"uploads/{gn}"
        except Exception:
            gradcam_path = None
    if result.get("gradcam_solid_b64"):
        try:
            sb = base64.b64decode(result["gradcam_solid_b64"])
            sn = f"gradcam_solid_{Path(saved_filename).stem}.png"
            sp = str(UPLOADS_DIR / sn)
            with open(sp, "wb") as f:
                f.write(sb)
            gradcam_solid_path = f"uploads/{sn}"
        except Exception:
            gradcam_solid_path = None

    pid = upsert_patient(g.user_id, patient_code, age, sex)
    scan_id = insert_scan(
        patient_id=pid, clinician_id=g.user_id, patient_code=patient_code,
        patient_name=patient_name, age=age, sex=sex, modality=modality,
        filename=saved_filename, predicted_label=result["predicted_label"],
        confidence=result["confidence"], severity=result["finding_severity"],
        clinical_note=result["clinical_note"], probabilities=result["probabilities"],
        gradcam_path=gradcam_path, gradcam_solid_path=gradcam_solid_path, report_path=None,
    )

    return jsonify({
        "scan_id": scan_id, "modality": result["modality"],
        "predicted_label": result["predicted_label"], "confidence": result["confidence"],
        "severity": result["finding_severity"], "probabilities": result["probabilities"],
        "gradcam_b64": result["gradcam_b64"], "gradcam_solid_b64": result["gradcam_solid_b64"],
        "clinical_note": result["clinical_note"], "patient_code": patient_code,
        "patient_name": patient_name, "image_url": f"/static/uploads/{saved_filename}",
        "gradcam_url": f"/static/{gradcam_path}" if gradcam_path else None,
        "gradcam_solid_url": f"/static/{gradcam_solid_path}" if gradcam_solid_path else None,
    })


# ---------------------------------------------------------------------------
# PDF report
# ---------------------------------------------------------------------------
@app.post("/api/scans/<int:scan_id>/report")
@auth_required
def api_generate_report(scan_id):
    scan = fetch_scan(scan_id)
    if not scan or scan["clinician_id"] != g.user_id:
        return jsonify({"error": "forbidden"}), 403

    original_path = UPLOADS_DIR / scan["filename"]
    original_bytes = original_path.read_bytes() if original_path.exists() else None

    gradcam_bytes = None
    if scan.get("gradcam_solid_path"):
        gp = BASE_DIR / "static" / scan["gradcam_solid_path"]
        if gp.exists():
            gradcam_bytes = gp.read_bytes()
    if not gradcam_bytes and scan.get("gradcam_path"):
        gp = BASE_DIR / "static" / scan["gradcam_path"]
        if gp.exists():
            gradcam_bytes = gp.read_bytes()

    report_path = generate_report(
        scan_id=scan_id, patient_code=scan["patient_code"],
        patient_name=scan.get("patient_name"), age=scan["age"], sex=scan["sex"],
        modality=scan["modality"], filename=scan["filename"], clinician_name=g.user["name"],
        predicted_label=scan["predicted_label"], confidence=scan["confidence"],
        severity=scan["severity"], clinical_note=scan["clinical_note"] or "",
        probabilities=scan["probabilities"], original_image_bytes=original_bytes,
        gradcam_image_bytes=gradcam_bytes,
    )
    update_scan_report(scan_id, report_path)
    return jsonify({"report_path": report_path, "report_url": f"/api/scans/{scan_id}/report.pdf"})


@app.get("/api/scans/<int:scan_id>/report.pdf")
@auth_required
def api_download_report(scan_id):
    scan = fetch_scan(scan_id)
    if not scan or scan["clinician_id"] != g.user_id:
        return jsonify({"error": "forbidden"}), 403
    if not scan["report_path"]:
        return jsonify({"error": "not_generated"}), 404
    p = scan["report_path"]
    if not Path(p).exists():
        return jsonify({"error": "missing_file"}), 404
    return send_file(p, mimetype="application/pdf", as_attachment=False,
                     download_name=f"radiomed_report_scan_{scan_id}.pdf")


# ---------------------------------------------------------------------------
# History + delete
# ---------------------------------------------------------------------------
@app.get("/api/scans")
@auth_required
def api_list_scans():
    return jsonify({"scans": fetch_scans_by_clinician(g.user_id)})


@app.get("/api/scans/<int:scan_id>")
@auth_required
def api_get_scan(scan_id):
    scan = fetch_scan(scan_id)
    if not scan or scan["clinician_id"] != g.user_id:
        return jsonify({"error": "forbidden"}), 403
    return jsonify(scan)


@app.delete("/api/scans/<int:scan_id>")
@auth_required
def api_delete_scan(scan_id):
    scan = fetch_scan(scan_id)
    if not scan or scan["clinician_id"] != g.user_id:
        return jsonify({"error": "forbidden"}), 403
    for col in ["filename", "gradcam_path", "gradcam_solid_path"]:
        v = scan.get(col)
        if v:
            p = UPLOADS_DIR.parent / v
            try:
                if p.exists():
                    p.unlink()
            except Exception:
                pass
    if scan.get("report_path"):
        try:
            rp = Path(scan["report_path"])
            if rp.exists():
                rp.unlink()
        except Exception:
            pass
    delete_scan(scan_id, g.user_id)
    return jsonify({"deleted": True, "scan_id": scan_id})


@app.delete("/api/scans")
@auth_required
def api_delete_all_scans():
    cur = _conn().cursor()
    cur.execute("SELECT filename, gradcam_path, gradcam_solid_path, report_path FROM scans WHERE clinician_id=?", (g.user_id,))
    rows = cur.fetchall()
    cur.close()
    for row in rows:
        for col in ["filename", "gradcam_path", "gradcam_solid_path"]:
            v = row[col]
            if v:
                p = UPLOADS_DIR.parent / v
                try:
                    if p.exists():
                        p.unlink()
                except Exception:
                    pass
        if row["report_path"]:
            try:
                rp = Path(row["report_path"])
                if rp.exists():
                    rp.unlink()
            except Exception:
                pass
    n = delete_all_scans(g.user_id)
    return jsonify({"deleted": True, "count": n})


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------
@app.get("/api/dashboard/stats")
@auth_required
def api_dashboard_stats():
    return jsonify(fetch_dashboard_stats(g.user_id))


# ---------------------------------------------------------------------------
# Static SPA
# ---------------------------------------------------------------------------
@app.get("/")
def index():
    return send_from_directory(BASE_DIR / "templates", "index.html")


@app.get("/<path:page>")
def spa_route(page):
    allowed = {"index.html", "404.html"}
    if page in allowed:
        return send_from_directory(BASE_DIR / "templates", page)
    return send_from_directory(BASE_DIR / "templates", "404.html"), 404


@app.get("/healthz")
def healthz():
    return jsonify({"status": "ok", "time": datetime.now(timezone.utc).isoformat()})


if __name__ == "__main__":
    bootstrap()
    host = "127.0.0.1" if os.name == "nt" else "0.0.0.0"
    app.run(host=host, port=5000, debug=False, threaded=True)
else:
    bootstrap()
