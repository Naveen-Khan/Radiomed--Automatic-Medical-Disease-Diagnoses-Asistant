# Radiomed — Worklog

## Session: Fix FileNotFoundError + verify full pipeline with real models

### User reported error
User got `FileNotFoundError: [Errno 2] No such file or directory: '/home/z/my-project/s...'` at line 30 of `scripts/launch_server.py` on Windows.

### Root cause
Earlier `launch_server.py` had hardcoded Linux paths (`/home/z/my-project/...`) that don't exist on Windows. The user's machine has paths like `C:\Users\Dell\Downloads\radiomed_project\...`.

### Fix applied
Replaced `launch_server.py` with a cross-platform version that:
- Uses `Path(__file__).resolve().parent.parent` to compute `PROJECT_ROOT` relative to the script itself (works on any OS)
- Uses `os.name == "nt"` check to pick the right process-detachment flag (CREATE_NEW_PROCESS_GROUP | DETACHED_PROCESS on Windows, start_new_session on Linux/Mac)
- Uses `sys.executable` so the same Python that runs the launcher also runs the app (important for venvs)

### Bonus: 3 trained .keras models uploaded
User uploaded their 3 trained `.keras` files (best_model.keras, pnemonia.keras, lungs_cancer_classification.keras) — total ~93 MB. I copied them into `models/` and verified the full inference pipeline works.

### Rebuilt everything (project had been wiped from disk)
The session was reset again, so I recreated:
- `auth/__init__.py` — JWT + bcrypt
- `database/db.py` — SQLite schema + delete_scan, delete_all_scans, delete_user
- `inference/gradcam.py` — Grad-CAM for DenseNet121 (target: conv5_block16_concat)
- `inference/model_loader.py` — lazy load + get_model_status
- `inference/pipeline.py` — both overlay styles (JET + solid single-color)
- `report/pdf.py` — full-page A4 PDF (with KeepInFrame to guarantee 1 page)
- `app.py` — all routes incl. delete + settings + model status
- `static/css/design-system.css` — tokens + app shell components
- `static/css/landing.css` — landing page
- `static/css/auth.css` — login / register split layout
- `static/js/app.js` — SPA with all 8 routes (landing, login, register, dashboard, diagnose, patients, models, settings)
- `templates/index.html` + `404.html`
- Sample images copied from pptx extraction
- `scripts/launch_server.py` — cross-platform (Windows + Linux + Mac)
- `scripts/run_windows.bat`

### Verified end-to-end
- Server starts on port 5000
- All 3 models load successfully: `{"brain_mri":true,"lung_ct":true,"pneumonia_xray":true}`
- All 4 inference flows work:
  - MRI no_Tumor → "No Tumor" (100%) → Grad-CAM skipped (normal)
  - X-Ray pneumonia → "Pneumonia" (99.9%) → JET + Solid Grad-CAM both present
  - CT emphysema → "Adenocarcinoma" (37.5%) → JET + Solid both present
  - MRI pituitary → "Pituitary Tumor" (99.8%) → JET + Solid both present
- All 4 PDF reports generate successfully — **1 page each** (KeepInFrame ensures fit)
- Playwright UI smoke test confirms all routes render: landing, models (3 badges), diagnose (3 modality tiles + back btn + auto-code), settings (3 sections + signout + delete)

### ZIP
Final ZIP at `/home/z/my-project/download/radiomed_project.zip` includes the 3 trained `.keras` files (~93 MB).
