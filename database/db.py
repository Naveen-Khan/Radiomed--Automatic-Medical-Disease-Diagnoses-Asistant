"""SQLite schema + queries (with delete_scan, delete_all_scans, delete_user)."""
from __future__ import annotations

import json
import sqlite3
import threading
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "database" / "diag.db"

_local = threading.local()


def _conn() -> sqlite3.Connection:
    if not hasattr(_local, "conn"):
        conn = sqlite3.connect(str(DB_PATH), check_same_thread=False, timeout=30)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA foreign_keys=ON;")
        _local.conn = conn
    return _local.conn


@contextmanager
def get_cursor():
    cur = _conn().cursor()
    try:
        yield cur
        _conn().commit()
    except Exception:
        _conn().rollback()
        raise
    finally:
        cur.close()


def init_db():
    with get_cursor() as cur:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'clinician',
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS patients (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                clinician_id INTEGER NOT NULL,
                patient_code TEXT NOT NULL,
                age INTEGER,
                sex TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (clinician_id) REFERENCES users(id)
            )
        """)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS scans (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_id INTEGER NOT NULL,
                clinician_id INTEGER NOT NULL,
                patient_code TEXT NOT NULL,
                patient_name TEXT,
                age INTEGER,
                sex TEXT,
                modality TEXT NOT NULL,
                filename TEXT NOT NULL,
                predicted_label TEXT NOT NULL,
                confidence REAL NOT NULL,
                severity TEXT NOT NULL,
                clinical_note TEXT,
                probabilities_json TEXT NOT NULL,
                gradcam_path TEXT,
                gradcam_solid_path TEXT,
                report_path TEXT,
                status TEXT NOT NULL DEFAULT 'completed',
                created_at TEXT NOT NULL,
                FOREIGN KEY (patient_id) REFERENCES patients(id),
                FOREIGN KEY (clinician_id) REFERENCES users(id)
            )
        """)
        for col in ["patient_name", "gradcam_solid_path"]:
            try:
                cur.execute(f"SELECT {col} FROM scans LIMIT 0")
            except Exception:
                cur.execute(f"ALTER TABLE scans ADD COLUMN {col} TEXT")


def insert_user(email, name, password_hash, role="clinician") -> int:
    with get_cursor() as cur:
        cur.execute(
            "INSERT INTO users(email, name, role, password_hash, created_at) VALUES(?,?,?,?,?)",
            (email, name, role, password_hash, _now()),
        )
        return cur.lastrowid


def fetch_user_by_email(email):
    cur = _conn().cursor()
    cur.execute("SELECT * FROM users WHERE email=?", (email,))
    row = cur.fetchone()
    cur.close()
    return dict(row) if row else None


def fetch_user_by_id(uid):
    cur = _conn().cursor()
    cur.execute("SELECT * FROM users WHERE id=?", (uid,))
    row = cur.fetchone()
    cur.close()
    return dict(row) if row else None


def delete_user(uid):
    with get_cursor() as cur:
        cur.execute("DELETE FROM scans WHERE clinician_id=?", (uid,))
        cur.execute("DELETE FROM patients WHERE clinician_id=?", (uid,))
        cur.execute("DELETE FROM users WHERE id=?", (uid,))


def upsert_patient(clinician_id, patient_code, age, sex) -> int:
    with get_cursor() as cur:
        cur.execute(
            "INSERT INTO patients(clinician_id, patient_code, age, sex, created_at) VALUES(?,?,?,?,?)",
            (clinician_id, patient_code, age, sex, _now()),
        )
        return cur.lastrowid


def insert_scan(*, patient_id, clinician_id, patient_code, patient_name, age, sex,
                modality, filename, predicted_label, confidence, severity,
                clinical_note, probabilities, gradcam_path, gradcam_solid_path,
                report_path) -> int:
    with get_cursor() as cur:
        cur.execute(
            """INSERT INTO scans(
                patient_id, clinician_id, patient_code, patient_name, age, sex,
                modality, filename, predicted_label, confidence, severity,
                clinical_note, probabilities_json, gradcam_path, gradcam_solid_path,
                report_path, status, created_at
            ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (patient_id, clinician_id, patient_code, patient_name, age, sex,
             modality, filename, predicted_label, confidence, severity,
             clinical_note, json.dumps(probabilities), gradcam_path, gradcam_solid_path,
             report_path, "completed", _now()),
        )
        return cur.lastrowid


def update_scan_report(scan_id, report_path):
    with get_cursor() as cur:
        cur.execute("UPDATE scans SET report_path=? WHERE id=?", (report_path, scan_id))


def fetch_scan(scan_id):
    cur = _conn().cursor()
    cur.execute("SELECT * FROM scans WHERE id=?", (scan_id,))
    row = cur.fetchone()
    cur.close()
    if not row:
        return None
    d = dict(row)
    d["probabilities"] = json.loads(d.pop("probabilities_json"))
    return d


def fetch_scans_by_clinician(clinician_id, limit=200):
    cur = _conn().cursor()
    cur.execute("""
        SELECT id, patient_code, patient_name, age, sex, modality, filename,
               predicted_label, confidence, severity, status, created_at, report_path
        FROM scans WHERE clinician_id=?
        ORDER BY datetime(created_at) DESC LIMIT ?
    """, (clinician_id, limit))
    rows = [dict(r) for r in cur.fetchall()]
    cur.close()
    return rows


def delete_scan(scan_id, clinician_id) -> bool:
    with get_cursor() as cur:
        cur.execute("DELETE FROM scans WHERE id=? AND clinician_id=?", (scan_id, clinician_id))
        return cur.rowcount > 0


def delete_all_scans(clinician_id) -> int:
    cur = _conn().cursor()
    cur.execute("SELECT COUNT(*) AS n FROM scans WHERE clinician_id=?", (clinician_id,))
    n = cur.fetchone()["n"]
    cur.close()
    with get_cursor() as cur:
        cur.execute("DELETE FROM scans WHERE clinician_id=?", (clinician_id,))
        cur.execute("DELETE FROM patients WHERE clinician_id=?", (clinician_id,))
    return n


def fetch_dashboard_stats(clinician_id):
    cur = _conn().cursor()
    cur.execute("SELECT COUNT(*) AS n FROM scans WHERE clinician_id=?", (clinician_id,))
    total = cur.fetchone()["n"]
    cur.execute("SELECT COUNT(*) AS n FROM scans WHERE clinician_id=? AND severity='critical'", (clinician_id,))
    critical = cur.fetchone()["n"]
    cur.execute("SELECT COUNT(*) AS n FROM scans WHERE clinician_id=? AND severity='normal'", (clinician_id,))
    normal = cur.fetchone()["n"]
    cur.execute("SELECT COUNT(*) AS n FROM scans WHERE clinician_id=? AND severity='abnormal'", (clinician_id,))
    abnormal = cur.fetchone()["n"]
    cur.execute("SELECT modality, COUNT(*) AS n FROM scans WHERE clinician_id=? GROUP BY modality", (clinician_id,))
    by_modality = {r["modality"]: r["n"] for r in cur.fetchall()}
    cur.close()
    return {
        "total_scans": total, "critical": critical, "abnormal": abnormal,
        "normal": normal, "by_modality": by_modality,
    }


def _now():
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
