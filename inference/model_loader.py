"""Load the 3 trained .keras models lazily."""
from __future__ import annotations

from pathlib import Path
from tensorflow.keras.models import load_model

_MODELS_DIR = Path(__file__).resolve().parent.parent / "models"

BRAIN_TUMOR_PATH = _MODELS_DIR / "best_model.keras"
LUNG_CANCER_PATH = _MODELS_DIR / "lungs_cancer_classification.keras"
PNEUMONIA_PATH = _MODELS_DIR / "pnemonia.keras"

CLASS_NAMES_BRAIN = ["Glioma Tumor", "Meningioma Tumor", "No Tumor", "Pituitary Tumor"]
CLASS_NAMES_XRAY = ["Normal", "Pneumonia"]
CLASS_NAMES_LUNGS = ["Normal", "Adenocarcinoma", "Large Cell Carcinoma", "Squamous Cell Carcinoma"]

CLINICAL_NOTES = {
    "Glioma Tumor": "Gliomas originate in glial cells and are the most common primary brain tumors. Correlate with contrast-enhanced MRI and clinical presentation.",
    "Meningioma Tumor": "Typically slow-growing extra-axial tumors arising from arachnoid cap cells. Often managed conservatively when small and asymptomatic.",
    "No Tumor": "No mass lesion or abnormal enhancement detected on this MRI slice. Recommend clinical correlation.",
    "Pituitary Tumor": "Pituitary adenomas may present with endocrine dysfunction or visual field defects. Suggest dedicated sellar protocol if not already performed.",
    "Normal": "No radiographic evidence of consolidation, effusion, or cardiomegaly.",
    "Pneumonia": "Findings suggestive of pulmonary consolidation. Recommend correlation with clinical signs, CRP, and blood cultures.",
    "Adenocarcinoma": "Most common non-small cell histology; peripheral location typical. Tissue diagnosis via biopsy is recommended.",
    "Large Cell Carcinoma": "Undifferentiated non-small cell carcinoma with rapid growth. Urgent referral to thoracic oncology MDT.",
    "Squamous Cell Carcinoma": "Often centrally located; may present with hemoptysis. Staging CT/PET and histological confirmation required.",
}

_brain_model = None
_lungs_model = None
_xray_model = None


def _check_file(path):
    if not path.exists():
        raise FileNotFoundError(
            f"Model file '{path.name}' not found in models/ directory. "
            f"Please copy your trained .keras file to: {path}"
        )


def get_brain_model():
    global _brain_model
    if _brain_model is None:
        _check_file(BRAIN_TUMOR_PATH)
        _brain_model = load_model(BRAIN_TUMOR_PATH, compile=False)
    return _brain_model


def get_lungs_model():
    global _lungs_model
    if _lungs_model is None:
        _check_file(LUNG_CANCER_PATH)
        _lungs_model = load_model(LUNG_CANCER_PATH, compile=False)
    return _lungs_model


def get_xray_model():
    global _xray_model
    if _xray_model is None:
        _check_file(PNEUMONIA_PATH)
        _xray_model = load_model(PNEUMONIA_PATH, compile=False)
    return _xray_model


def get_model_status() -> dict:
    return {
        "brain_mri": BRAIN_TUMOR_PATH.exists(),
        "pneumonia_xray": PNEUMONIA_PATH.exists(),
        "lung_ct": LUNG_CANCER_PATH.exists(),
    }
