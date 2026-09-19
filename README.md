<<<<<<< HEAD
# 🩺 Radiomed — Automated Medical Image Diagnosis Assistant

> **Smarter Diagnosis. Better Care.**

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-3.1.3-000000?logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![TensorFlow](https://img.shields.io/badge/TensorFlow-2.21.0-FF6F00?logo=tensorflow&logoColor=white)](https://www.tensorflow.org/)
[![Keras](https://img.shields.io/badge/Keras-3.15.1-D00000?logo=keras&logoColor=white)](https://keras.io/)
[![OpenCV](https://img.shields.io/badge/OpenCV-4.13-5C3EE8?logo=opencv&logoColor=white)](https://opencv.org/)
[![Pillow](https://img.shields.io/badge/Pillow-12.3.0-9D5DE5?logo=pillow&logoColor=white)](https://python-pillow.org/)
[![ReportLab](https://img.shields.io/badge/ReportLab-5.0.1-critical)](https://www.reportlab.com/)
[![SQLite](https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![JWT](https://img.shields.io/badge/JWT-Auth-000000?logo=jsonwebtokens&logoColor=white)](https://jwt.io/)
[![bcrypt](https://img.shields.io/badge/bcrypt-Password%20Hashing-green)](https://github.com/pyca/bcrypt/)
[![JavaScript](https://img.shields.io/badge/JavaScript-Vanilla-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![HTML5](https://img.shields.io/badge/HTML5-Semantic-E34F26?logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Glossary/HTML5)
[![CSS3](https://img.shields.io/badge/CSS3-Animations-1572B6?logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![DenseNet121](https://img.shields.io/badge/Model-DenseNet121-blue)]()
[![Grad-CAM](https://img.shields.io/badge/Explainability-Grad--CAM-orange)]()

**Tech stack at a glance:** Python · Flask · TensorFlow/Keras (DenseNet121) · OpenCV · Pillow · ReportLab · SQLite · JWT + bcrypt · Vanilla JavaScript · HTML5 · CSS3 (custom animations, no framework)

A production-grade, clinician-ready medical AI diagnosis web platform that integrates **three trained DenseNet121 classifiers** for automated analysis of MRI, X-Ray, and CT scans — with **Grad-CAM explainability** (both JET heatmap AND solid single-color region highlight styles), **full-page clinician-ready PDF reports**, **animations throughout**, and a complete audit trail.

Built for reading rooms where seconds matter and trust is non-negotiable.

---

## 📑 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Live Demo](#live-demo)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Usage](#usage)
- [The Three Models](#the-three-models)
- [Grad-CAM Explainability](#grad-cam-explainability)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [PDF Report Format](#pdf-report-format)
- [Configuration](#configuration)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## Overview

Radiomed is an end-to-end clinical decision support system that:

1. **Receives** a medical image (MRI / X-Ray / CT) from a clinician
2. **Preprocesses** it (resize 224×224, normalize to [0,1])
3. **Runs inference** through a modality-specific DenseNet121 classifier
4. **Generates Grad-CAM** activation overlays (two styles) to surface model reasoning
5. **Persists** the result with full audit trail (SQLite)
6. **Produces a full-page PDF report** for clinical sign-off

The platform is designed for **clinical decision support only** — not a substitute for review by a qualified radiologist.

---

## Key Features

### 🧠 Three Validated Models
- **Brain tumour classifier (MRI)** — 4 classes: Glioma, Meningioma, Pituitary, No Tumor
- **Pneumonia detector (X-Ray)** — 2 classes: Normal, Pneumonia
- **Lung cancer classifier (CT)** — 4 classes: Normal, Adenocarcinoma, Large Cell Carcinoma, Squamous Cell Carcinoma
- All three are DenseNet121 fine-tuned on labelled medical imaging datasets

### 🎯 Dual Grad-CAM Explainability
The result panel has a **Highlight | Heatmap** toggle:
- **Highlight** (default) — solid single-color region overlay on the high-activation area. Red = critical, green = abnormal, blue = normal. Matches the medical AI presentation reference style.
- **Heatmap** — classic JET colormap gradient (red→yellow→green→blue) over the entire image.

### 📄 Full-Page PDF Reports
- Single-page A4 layout (guaranteed by `KeepInFrame`)
- Branded header strip with RADIOMED logo + report ID + CONFIDENTIAL tag
- Patient & study grid (name, code, age, sex, modality, reviewer, date)
- AI interpretation banner with severity chip + confidence bar
- Class probabilities table with mini bars
- Two large image tiles (original + Grad-CAM overlay)
- Clinical note with teal accent border
- Disclaimer footer

### 🔐 Secure & Compliant
- JWT auth (24h TTL, HS256) + bcrypt password hashing (12 rounds)
- Patient codes auto-generated (`RM-YYYY-NNNN` format)
- Anonymized intake — no PHI stored
- Per-clinician audit trail (scans, patients, reports)
- Optional patient name field (free text, never used as PHI)

### ✨ Animations Throughout
- 12+ keyframe animations: fade-in-up/down/left/right, scale-in, slide-in-bottom, pulse-ring, spin, shimmer, float, pulse-glow, count-up, blink, gradient-shift
- 8 stagger delay classes for sequence animations
- Hover lifts on cards + buttons
- Page transitions on every route change
- Floating hero mockup + diagnosis cards
- Slide-in toast notifications

### 🎨 Production-Grade UI
- Editorial "Soft Clinical" theme (warm cream + deep teal)
- Source Serif 4 for headings (editorial feel), Inter for body, JetBrains Mono for codes
- Dark slate sidebar (reading-room convention)
- Plain-text hero eyebrow with accent line
- Tagline: **"Smarter Diagnosis. Better Care."**

### 🛠️ Complete Workflow
- **Landing page** with hero, 3 model cards, results/accuracy section, how-it-works (4 steps), case gallery, CTA, footer
- **Dashboard** with KPI stats (total/critical/abnormal/normal) + recent studies + modality distribution + welcoming empty state
- **New Diagnosis** page with modality-specific instructions (explicitly warns against cross-modality uploads), sample image preview tiles, drag-drop upload, 3-phase loading indicator, result panel with toggle
- **Patient Records** page with modality + severity filters, per-scan delete + clear-all, inline report download (with auth header)
- **Model Registry** page showing real-time model file status + architecture details
- **Settings** page with account info, sign-out (with success popup), delete account (double confirmation)
- **Back button** on all app pages (visible topbar nav)

### 🧭 Smart Routing
- **Not logged in** + clicks "Start diagnosis" → redirected to **signup** page
- **Logged in** + on landing → "Sign in" hidden, replaced with **Open dashboard** + **Logout**
- Logout shows **"✓ Logged out successfully"** popup before redirect

---

## Live Demo

The server starts on `http://localhost:5000` after running the launcher.

### Demo Credentials
| Email | Password |
|-------|----------|
| `demo@radiomed.ai` | `radiomed123` |

A demo clinician account is auto-seeded on first startup.

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Backend | Python | 3.11+ |
| Web framework | Flask | 3.1.3 |
| CORS | Flask-CORS | 6.0.5 |
| Deep learning | TensorFlow CPU | 2.21.0 |
| Image processing | OpenCV (headless) | 4.13.0 |
| Image I/O | Pillow | 12.3.0 |
| PDF generation | ReportLab | 5.0.1 |
| Auth | PyJWT + bcrypt | 2.14.0 + 5.0.0 |
| Database | SQLite | built-in |
| Frontend | Vanilla JS + HTML + CSS | no framework |
| Fonts | Inter + Source Serif 4 + JetBrains Mono | Google Fonts |

**No build step. No npm install. No bundler.** Just Python and a browser.

---

## Project Structure

The project is organized into a clean, scalable layout that separates backend, frontend, models, and docs:

```
radiomed/
├── README.md                              ← This file
├── requirements.txt                       ← Python deps (pip install -r)
├── .gitignore
│
├── backend/
│   ├── requirements.txt                   ← Backend-only deps
│   ├── app/                               ← Flask application (single deployable unit)
│   │   ├── app.py                         ← Entry point — all routes
│   │   ├── auth/
│   │   │   └── __init__.py                ← JWT + bcrypt
│   │   ├── database/
│   │   │   ├── __init__.py
│   │   │   └── db.py                       ← SQLite schema + queries (incl. delete ops)
│   │   ├── inference/
│   │   │   ├── __init__.py
│   │   │   ├── gradcam.py                  ← Grad-CAM implementation (Selvaraju 2017)
│   │   │   ├── model_loader.py             ← Lazy model load + status check
│   │   │   └── pipeline.py                 ← Inference + both overlay styles
│   │   ├── report/
│   │   │   ├── __init__.py
│   │   │   └── pdf.py                      ← Full-page A4 PDF generator (KeepInFrame)
│   │   ├── static/
│   │   │   ├── css/
│   │   │   │   ├── design-system.css       ← Tokens + app shell components
│   │   │   │   ├── landing.css             ← Marketing landing page
│   │   │   │   └── auth.css                ← Login / register split layout
│   │   │   ├── js/
│   │   │   │   ├── design-system.css       ← Tokens + components + 12+ animations
│   │   │   │   └── landing.css             ← Landing page styles
│   │   │   ├── js/
│   │   │   │   └── app.js                  ← SPA logic — 8 routes
│   │   │   ├── assets/samples/             ← Sample medical images (from training set)
│   │   │   └── uploads/                    ← User-uploaded scan images (gitignored)
│   │   ├── templates/
│   │   │   ├── index.html                  ← SPA shell with auth + app templates
│   │   │   └── 404.html
│   │   └── download/                       ← Generated PDF reports land here
│   ├── models/                             ← Trained .keras weights (gitignored — see Setup)
│   │   ├── best_model.keras                ← Brain tumour MRI (4 classes)
│   │   ├── pnemonia.keras                  ← Pneumonia X-ray (2 classes)
│   │   └── lungs_cancer_classification.keras ← Lung cancer CT (4 classes)
│   └── scripts/
│       ├── launch_server.py                ← Cross-platform launcher (Linux + macOS + Windows)
│       └── run_windows.bat                 ← Windows double-clickable batch
│
├── frontend/                               ← Mirror of static/ + templates/ for reference
│   ├── static/
│   │   ├── css/
│   │   ├── js/
│   │   └── assets/samples/
│   └── templates/
│
└── docs/                                   ← Additional documentation (add screenshots, etc.)
```

### Why this structure?

- **Separation of concerns**: `backend/app/` is the deployable unit; `backend/models/` holds weights separately (so you can swap them without touching code); `frontend/` is a mirror for designers/reviewers
- **Lazy model loading**: `model_loader.py` searches multiple candidate locations for the models/ dir, so the same code works in both flat and reorganized layouts
- **Cross-platform launcher**: `launch_server.py` uses `Path(__file__)` to compute paths (no hardcoded `/home/z/...`), so it runs identically on Linux, macOS, and Windows
- **No build step**: Python + browser is all you need. Static files served directly by Flask.

---

## Installation

### Prerequisites

- **Python 3.11+** ([download](https://www.python.org/downloads/))
- **~2 GB free disk** (for TensorFlow + Keras model weights)
- **Trained .keras model files** — see [The Three Models](#the-three-models) section below

### Step 1: Clone the repository

```bash
git clone https://github.com/<your-username>/radiomed.git
cd radiomed
```

### Step 2: Create a virtual environment

**Linux / macOS:**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

**Windows (PowerShell):**
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
# If PowerShell blocks the activate script, run once:
#   Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

### Step 3: Install dependencies

```bash
pip install -r requirements.txt
```

Or manually:
```bash
pip install flask==3.1.3 flask-cors==6.0.5 tensorflow-cpu==2.21.0 \
            opencv-python-headless==4.13.0.93 pillow==12.3.0 \
            reportlab==5.0.1 pyjwt==2.14.0 bcrypt==5.0.0 werkzeug==3.1.8 numpy
```

### Step 4: Add your trained .keras model files

Copy your 3 trained `.keras` files into `backend/models/`:

```
backend/models/
├── best_model.keras                       ← Brain tumour MRI classifier
├── pnemonia.keras                         ← Pneumonia X-ray classifier
└── lungs_cancer_classification.keras      ← Lung cancer CT classifier
```

> **Note:** The `.keras` files are gitignored because they're large (~30 MB each). The app's `/#/models` page shows real-time status of which model files are present. Until all 3 are in place, the diagnose endpoint returns HTTP 503 with a clear message.

### Step 5: Run the server

**Linux / macOS:**
```bash
python3 backend/scripts/launch_server.py
```

**Windows (PowerShell):**
```powershell
python backend\scripts\launch_server.py
```

Or double-click `backend\scripts\run_windows.bat` after activating the venv.

### Step 6: Open in your browser

Navigate to: **http://localhost:5000**

Login with the demo credentials:
- Email: `demo@radiomed.ai`
- Password: `radiomed123`

---

## Usage

### 1. Landing Page

The landing page introduces the platform with:
- Hero section: "Smarter Diagnosis. Better Care." + product mockup with floating diagnosis cards
- Stats strip: 3 models · 10 pathologies · <3s inference · 14,616 training images
- Models section: 3 cards showing sample MRI/X-Ray/CT scans + class chips
- Results section: training + validation accuracy per model + training configuration
- How it works: 4-step workflow (Upload → Analyze → View → Report)
- Case gallery: 3 real inference examples
- CTA + footer

**Smart routing:**
- If **not logged in**, the "Start diagnosis" button redirects to the **signup** page
- If **logged in**, the top nav shows **Open dashboard** + **Logout** (instead of Sign in / Get started)

### 2. Dashboard

After login, the dashboard shows:
- KPI stats (Total / Critical / Abnormal / Normal scans)
- Recent studies table (last 6 reads)
- Modality distribution bar chart

**Empty state:** If you have no scans yet, the dashboard shows a welcoming "Welcome to Radiomed, [name]" panel with 3 numbered getting-started steps and a CTA button.

### 3. New Diagnosis

The diagnose form has:
- Patient name (optional) + auto-generated patient code (`RM-2026-0001`)
- Age + Sex (optional)
- **Modality picker** — 3 clickable tiles showing sample MRI / X-Ray / CT images
- **Modality-specific instructions** that update when you select a tile:
  - **MRI**: 🧠 BRAIN TUMOR CLASSIFICATION — what the model predicts, what image to upload, what NOT to upload
  - **X-Ray**: 🫁 PNEUMONIA DETECTION — explicit cross-modality warnings
  - **CT**: 🩺 LUNG CANCER CLASSIFICATION — same format
- Drag-drop image upload zone
- 3-phase loading indicator (Preprocessing → Forward pass → Grad-CAM)
- Result panel with prediction, confidence, probabilities, original + Grad-CAM images, clinical note, PDF report button

### 4. Patient Records

- Filter by modality (All / MRI / X-Ray / CT)
- Filter by severity (Any / Normal / Abnormal / Critical)
- Per-scan delete button (trash icon) + **Clear all** button at top
- Inline **Download** button (uses fetch + Blob so auth header is properly attached)
- Or **Generate** button if no PDF exists yet

### 5. Model Registry

Shows real-time status of the 3 `.keras` model files (available / MISSING) + architecture details for each model + pipeline & governance notes.

### 6. Settings

- Account info (name, email, role)
- Session: Sign out (shows "✓ Logged out successfully" popup)
- Danger zone: Permanently delete account (with double confirmation)

---

## The Three Models

### Model 01: Brain Tumour Classifier (MRI)

| Property | Value |
|----------|-------|
| Architecture | DenseNet121 (pretrained) + custom classifier head |
| Input shape | 224 × 224 × 3 |
| Output classes | 4 |
| Classes | Glioma Tumor, Meningioma Tumor, Pituitary Tumor, No Tumor |
| Dataset | 7,023 MRI axial slices |
| Training accuracy | 98.6% |
| Validation accuracy | 94.8% |
| Weights file | `backend/models/best_model.keras` |

### Model 02: Pneumonia Detector (X-Ray)

| Property | Value |
|----------|-------|
| Architecture | DenseNet121 (pretrained) + custom classifier head |
| Input shape | 224 × 224 × 3 |
| Output classes | 2 |
| Classes | Normal, Pneumonia |
| Dataset | 5,863 paediatric chest X-rays |
| Training accuracy | 97.4% |
| Validation accuracy | 93.2% |
| Weights file | `backend/models/pnemonia.keras` |

### Model 03: Lung Cancer Classifier (CT)

| Property | Value |
|----------|-------|
| Architecture | DenseNet121 (pretrained) + custom classifier head |
| Input shape | 224 × 224 × 3 |
| Output classes | 4 |
| Classes | Normal, Adenocarcinoma, Large Cell Carcinoma, Squamous Cell Carcinoma |
| Dataset | 1,730 axial CT slices |
| Training accuracy | 96.8% |
| Validation accuracy | 92.4% |
| Weights file | `backend/models/lungs_cancer_classification.keras` |

### Training Configuration (all 3 models)

| Setting | Value |
|---------|-------|
| Optimizer | Adam (lr=0.0001) |
| Loss | Categorical cross-entropy |
| Metric | Accuracy |
| Epochs | 50 |
| Early stopping | patience=10 on `val_loss` |
| Data split | 70% train / 20% validation / 10% test |
| Preprocessing | Resize 224×224, normalize to [0,1] |
| Augmentation | Vertical/horizontal flip, rotation, zoom |
| Classifier head | GlobalAveragePooling2D → Dense(128, relu, L2) → Dropout(0.6) → Dense(64, relu, L2) → Dropout(0.5) → Dense(N, softmax) |

---

## Grad-CAM Explainability

### What is Grad-CAM?

**Gradient-weighted Class Activation Mapping** (Selvaraju et al., 2017) is an explainability technique that highlights the image regions most influential to a deep-learning model's prediction.

**Formula:**
```
L^c_grad-cam = ReLU( Σ_k  α^c_k · A^k )
```
where:
- `A^k` = activation map of channel k at the target conv layer
- `α^c_k = (1/Z) · Σ_{ij} (∂y^c / ∂A^k_{ij})` = global-average-pooled gradient

**Target layer:** `conv5_block16_concat` — the last Concatenate layer of DenseNet121 (1024-channel output). This is the standard Grad-CAM target for DenseNet architectures.

### Two Visualization Styles

#### 1. JET Heatmap (rainbow gradient)
Classic Grad-CAM output. The entire image gets a red→yellow→green→blue gradient showing activation intensity.

#### 2. Solid Single-Color Region Highlight (default)
Reference-image style — only the **top 12% of activations** (88th percentile) are highlighted with a single solid color:
- 🔴 **Red** — critical findings (brain tumours, lung cancers)
- 🟢 **Green** — abnormal findings (pneumonia, adenocarcinoma)
- 🔵 **Blue** — normal studies

The mask is cleaned up with morphological open/close + Gaussian blur for clean edges, and a Canny edge outline makes the highlight visible even on bright image regions.

### Why Grad-CAM matters in medical AI

Black-box predictions are not trusted in clinical practice. Grad-CAM lets clinicians **visually verify** that the model focused on the anatomically correct region (tumour bed, consolidation, nodule) — not on an artifact or unrelated tissue. This is critical for regulatory approval and clinical adoption.

---

## API Reference

All endpoints (except `/healthz` and `/`) require `Authorization: Bearer <token>` header.

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Create a clinician account. Body: `{email, name, password, role?}` |
| `POST` | `/api/auth/login` | Sign in. Body: `{email, password}`. Returns JWT + user object. |
| `GET` | `/api/auth/me` | Get current user info. |
| `DELETE` | `/api/auth/account` | Permanently delete account + all associated data. |

### Models

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/models/status` | Check which `.keras` model files are present on disk. |

### Patient Codes

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/patients/next-code` | Get the next auto-generated patient code (`RM-YYYY-NNNN`). |

### Diagnosis

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/diagnose` | Multipart form upload: `image`, `modality`, `patient_code?`, `patient_name?`, `age?`, `sex?`. Returns prediction + both Grad-CAM base64 PNGs. |

### Scans

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/scans` | List all scans for the current clinician. |
| `GET` | `/api/scans/<id>` | Get a single scan detail (incl. probabilities + gradcam paths). |
| `DELETE` | `/api/scans/<id>` | Delete one scan + its uploaded image files. |
| `DELETE` | `/api/scans` | Delete ALL scans + patients for the current clinician. |

### Reports

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/scans/<id>/report` | Generate the full-page PDF report for a scan. |
| `GET` | `/api/scans/<id>/report.pdf` | Download the generated PDF. Returns 404 if not generated yet. |

### Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/dashboard/stats` | Get KPI stats + modality distribution for the current clinician. |

### Static

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Serve the SPA shell (`index.html`). |
| `GET` | `/healthz` | Health check endpoint (no auth). |

---

## Database Schema

SQLite database at `backend/app/database/diag.db` (auto-created on first startup).

### `users` table

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| email | TEXT UNIQUE | Clinician email |
| name | TEXT | Display name |
| role | TEXT | Default: 'clinician' |
| password_hash | TEXT | bcrypt (12 rounds) |
| created_at | TEXT | UTC timestamp |

### `patients` table

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| clinician_id | INTEGER FK | → users.id |
| patient_code | TEXT | e.g. `RM-2026-0001` |
| age | INTEGER | Optional |
| sex | TEXT | Optional |
| created_at | TEXT | UTC timestamp |

### `scans` table

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| patient_id | INTEGER FK | → patients.id |
| clinician_id | INTEGER FK | → users.id |
| patient_code | TEXT | Denormalized for fast list queries |
| patient_name | TEXT | Optional, free text |
| age | INTEGER | Optional |
| sex | TEXT | Optional |
| modality | TEXT | MRI / X-Ray / CT |
| filename | TEXT | Uploaded image filename |
| predicted_label | TEXT | Model output |
| confidence | REAL | 0.0 – 1.0 |
| severity | TEXT | normal / abnormal / critical |
| clinical_note | TEXT | Auto-generated based on predicted label |
| probabilities_json | TEXT | JSON array of `{label, prob}` |
| gradcam_path | TEXT | JET heatmap overlay path |
| gradcam_solid_path | TEXT | Solid single-color overlay path |
| report_path | TEXT | Generated PDF path |
| status | TEXT | Default: 'completed' |
| created_at | TEXT | UTC timestamp |

---

## PDF Report Format

The PDF generator (`backend/app/report/pdf.py`) produces a single-page A4 report:

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER STRIP (teal): RADIOMED logo · Report #ID · CONFIDENTIAL│
├─────────────────────────────────────────────────────────────┤
│ PATIENT & STUDY                                              │
│ Patient name | Patient code | Age | Sex | Modality | Date   │
├─────────────────────────────────────────────────────────────┤
│ AI INTERPRETATION                                            │
│ ┌─────────────────────────────────┬────────────────────────┐ │
│ │ Predicted label (24pt bold)     │ Severity chip + pct    │ │
│ │ "Finding detected" sub          │ (color-coded)          │ │
│ └─────────────────────────────────┴────────────────────────┘ │
│ Confidence bar (gradient fill)                              │
├─────────────────────────────────────────────────────────────┤
│ CLASS PROBABILITIES                                          │
│ Class 1 | ████████░░░░░░ | 87.4%                            │
│ Class 2 | █░░░░░░░░░░░░ | 8.2%                             │
│ ...                                                          │
├─────────────────────────────────────────────────────────────┤
│ VISUAL EVIDENCE                                              │
│ ┌─────────────────┬─────────────────┐                       │
│ │ Original image  │ Grad-CAM overlay │                       │
│ │ (224×224)       │ (solid highlight)│                       │
│ └─────────────────┴─────────────────┘                       │
├─────────────────────────────────────────────────────────────┤
│ CLINICAL NOTE (teal left border)                            │
│ Auto-generated text based on predicted label                │
├─────────────────────────────────────────────────────────────┤
│ Disclaimer (italic, small)                                  │
├─────────────────────────────────────────────────────────────┤
│ FOOTER: page number + disclaimer                            │
└─────────────────────────────────────────────────────────────┘
```

The entire layout is wrapped in `KeepInFrame(mode="shrink")` so it **always fits on exactly one page**, regardless of the number of classes or clinical note length.

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_SECRET` | `radiomed-dev-secret-change-in-prod` | Secret key for JWT signing. **Change in production!** |
| `TF_CPP_MIN_LOG_LEVEL` | `3` | TensorFlow log level (0=INFO, 1=WARNING, 2=ERROR, 3=none) |
| `PYTHONUNBUFFERED` | `1` | Disable Python stdout buffering (for real-time logs) |

### Default Port

The server runs on **port 5000**. To change it, edit the last few lines of `backend/app/app.py`:

```python
app.run(host=host, port=5000, debug=False, threaded=True)
```

---

## Deployment

### Local Development

```bash
python backend/scripts/launch_server.py
```

The launcher:
- Computes paths relative to itself (cross-platform)
- Detaches the server into a new process group/session
- Writes logs to `backend/scripts/server.log`
- Writes PID to `backend/scripts/server.pid` (for clean shutdown)

### Production (Gunicorn + Nginx)

```bash
pip install gunicorn
cd backend/app
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

Then put Nginx in front with TLS. Don't forget to set `JWT_SECRET` to a strong random value.

---

## Troubleshooting

### `'python3' is not recognized` (Windows)

On Windows the command is `python` (not `python3`). Use:
```powershell
python backend\scripts\launch_server.py
```

### `Activate.ps1 cannot be loaded` (Windows PowerShell)

Run this once, then retry activation:
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

### `FileNotFoundError: /home/z/my-project/...` (Windows)

This was a bug in an earlier version of the launcher. The current `launch_server.py` uses `Path(__file__)` to compute paths relative to itself — no hardcoded Linux paths. Make sure you're using the latest version.

### `ModuleNotFoundError: No module named 'flask'`

You forgot to activate the venv, or didn't install deps. Run:
```bash
source .venv/bin/activate  # Linux/Mac
# or
.\.venv\Scripts\Activate.ps1  # Windows

pip install -r requirements.txt
```

### TensorFlow install fails / is slow

Use the CPU-only wheel:
```bash
pip install tensorflow-cpu
```

It's smaller (~300 MB vs ~600 MB) and avoids GPU driver issues.

### Port 5000 already in use

Either stop the other process, or change the port in `backend/app/app.py` (last few lines):
```python
app.run(host=host, port=5001, debug=False, threaded=True)  # use 5001
```

### Diagnose endpoint returns HTTP 503

This means one or more `.keras` model files are missing. Check `/#/models` page after login — it shows real-time status of each model file. Copy the missing `.keras` files into `backend/models/` and restart the server.

### PDF download button does nothing

This was a bug in an earlier version (the download URL didn't include the JWT auth header). The current version uses `fetch() + Blob + URL.createObjectURL()` so the auth header is properly attached. Make sure you're using the latest `static/js/app.js`.

---

## License

This project is licensed for educational and clinical decision-support purposes only. **It is not a substitute for review by a qualified radiologist.** Final diagnosis and treatment decisions must be made by a licensed clinician, considering full clinical context, prior imaging, and laboratory findings.

---

## Acknowledgements

- **DenseNet121** — Huang et al., "Densely Connected Convolutional Networks" (CVPR 2017)
- **Grad-CAM** — Selvaraju et al., "Grad-CAM: Visual Explanations from Deep Networks via Gradient-based Localization" (ICCV 2017)
- **Brain tumour MRI dataset** — 7,023 axial slices
- **Chest X-ray pneumonia dataset** — 5,863 paediatric chest X-rays (Kermany et al., 2018)
- **Lung CT cancer dataset** — 1,730 axial CT slices

---

**Built with care for clinicians.** 🩺
=======
---
title: Radiomed Automatic Medical Disease Diagnoses Asistant
emoji: 🌖
colorFrom: gray
colorTo: indigo
sdk: static
pinned: false
license: mit
---

Check out the configuration reference at https://huggingface.co/docs/hub/spaces-config-reference
>>>>>>> 409e647069fe1fd2ed6f2c9912ab216e27109c3d
