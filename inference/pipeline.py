"""
Inference pipeline with both Grad-CAM styles:
  - JET heatmap (rainbow gradient)
  - Solid single-color region highlight (reference-image style — fixed)
"""
from __future__ import annotations

import base64
import io
import cv2
import numpy as np
from PIL import Image

from .model_loader import (
    get_brain_model, get_lungs_model, get_xray_model,
    CLASS_NAMES_BRAIN, CLASS_NAMES_LUNGS, CLASS_NAMES_XRAY, CLINICAL_NOTES,
)
from .gradcam import gradcam, resolve_target_layer


def preprocess(pil_image: Image.Image) -> np.ndarray:
    pil_image = pil_image.convert("RGB").resize((224, 224), Image.BILINEAR)
    arr = np.array(pil_image, dtype=np.float32) / 255.0
    return np.expand_dims(arr, axis=0)


def _overlay_heatmap(original_pil: Image.Image, heatmap: np.ndarray) -> Image.Image:
    img = np.array(original_pil.convert("RGB").resize((224, 224), Image.BILINEAR))
    hm = np.maximum(heatmap, 0)
    hm = hm / (np.max(hm) + 1e-8)
    hm = np.power(hm, 0.8)
    hm = cv2.resize(hm, (224, 224))
    hm = np.uint8(255 * hm)
    hm = cv2.applyColorMap(hm, cv2.COLORMAP_JET)
    overlay = cv2.addWeighted(img, 0.5, hm, 0.5, 0)
    return Image.fromarray(overlay)


SOLID_HIGHLIGHT_COLORS = {
    "critical": (220, 60, 50),
    "abnormal": (60, 180, 90),
    "normal":   (60, 130, 220),
}


def _overlay_solid_highlight(
    original_pil: Image.Image,
    heatmap: np.ndarray,
    severity: str = "abnormal",
    threshold_percentile: float = 88.0,
    alpha: float = 0.55,
) -> Image.Image:
    """Reference-style solid-color region overlay (top 12% of activations)."""
    img = np.array(original_pil.convert("RGB").resize((224, 224), Image.BILINEAR)).astype(np.float32)

    hm = np.maximum(heatmap, 0)
    hm = hm / (np.max(hm) + 1e-8)
    hm = np.power(hm, 2.0)  # gamma boost — sharpens high-activation peaks
    hm = cv2.resize(hm, (224, 224), interpolation=cv2.INTER_CUBIC)

    thresh_val = np.percentile(hm, threshold_percentile)
    mask = (hm >= thresh_val).astype(np.float32)

    kernel_open = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    kernel_close = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel_open)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel_close)
    mask = cv2.GaussianBlur(mask, (15, 15), 0)
    mask = np.clip(mask, 0, 1)

    color_rgb = SOLID_HIGHLIGHT_COLORS.get(severity, SOLID_HIGHLIGHT_COLORS["abnormal"])
    color_layer = np.zeros_like(img)
    color_layer[:] = color_rgb

    brightened = np.clip(img * 1.05, 0, 255)
    blend_weight = (mask * alpha)[..., np.newaxis]
    overlay = (brightened * (1 - blend_weight) + color_layer * blend_weight).astype(np.uint8)

    edges = cv2.Canny((mask * 255).astype(np.uint8), 30, 100)
    edge_color = tuple(int(c * 0.7) for c in color_rgb)
    overlay[edges > 0] = edge_color

    return Image.fromarray(overlay)


def _pil_to_base64(pil_image: Image.Image, fmt: str = "PNG") -> str:
    buf = io.BytesIO()
    pil_image.save(buf, format=fmt)
    return base64.b64encode(buf.getvalue()).decode("utf-8")


def run_inference(pil_image: Image.Image, modality: str) -> dict:
    img_pp = preprocess(pil_image)

    if modality == "MRI":
        model = get_brain_model()
        labels = CLASS_NAMES_BRAIN
    elif modality == "X-Ray":
        model = get_xray_model()
        labels = CLASS_NAMES_XRAY
    elif modality == "CT":
        model = get_lungs_model()
        labels = CLASS_NAMES_LUNGS
    else:
        raise ValueError(f"Unknown modality: {modality}")

    gradcam_layer = resolve_target_layer(model)
    probs = model.predict(img_pp, verbose=0)[0]
    predicted_index = int(np.argmax(probs))
    predicted_label = labels[predicted_index]
    confidence = float(probs[predicted_index])

    probabilities = [
        {"label": lbl, "prob": float(round(p, 4))}
        for lbl, p in zip(labels, probs)
    ]

    if modality == "MRI":
        is_normal = predicted_label == "No Tumor"
        is_critical = predicted_label in ("Glioma Tumor", "Pituitary Tumor")
    elif modality == "X-Ray":
        is_normal = predicted_label == "Normal"
        is_critical = False
    else:
        is_normal = predicted_label == "Normal"
        is_critical = predicted_label in ("Large Cell Carcinoma", "Squamous Cell Carcinoma")

    severity = "normal" if is_normal else ("critical" if is_critical else "abnormal")

    gradcam_b64 = None
    gradcam_solid_b64 = None
    if not is_normal:
        try:
            heatmap = gradcam(model, img_pp, predicted_index, gradcam_layer)
            gradcam_pil = _overlay_heatmap(pil_image, heatmap)
            gradcam_b64 = _pil_to_base64(gradcam_pil)
            solid_pil = _overlay_solid_highlight(pil_image, heatmap, severity=severity)
            gradcam_solid_b64 = _pil_to_base64(solid_pil)
        except Exception:
            gradcam_b64 = None
            gradcam_solid_b64 = None

    clinical_note = CLINICAL_NOTES.get(predicted_label, "")

    return {
        "modality": modality,
        "predicted_label": predicted_label,
        "confidence": round(confidence, 4),
        "probabilities": probabilities,
        "gradcam_b64": gradcam_b64,
        "gradcam_solid_b64": gradcam_solid_b64,
        "clinical_note": clinical_note,
        "finding_severity": severity,
    }
