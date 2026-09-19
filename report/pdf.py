"""Full-page A4 PDF report — uses entire page real estate."""
from __future__ import annotations

import io
from pathlib import Path
from datetime import datetime, timezone

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage,
    KeepInFrame,
)
from reportlab.platypus.flowables import HRFlowable
from reportlab.pdfgen import canvas
from PIL import Image as PILImage

COLOR_PRIMARY = colors.HexColor("#0A6E5C")
COLOR_ACCENT  = colors.HexColor("#1F8A70")
COLOR_BG      = colors.HexColor("#FBF8F3")
COLOR_BG_ALT  = colors.HexColor("#F4EFE5")
COLOR_SURFACE = colors.HexColor("#FFFFFF")
COLOR_INK     = colors.HexColor("#1F2A36")
COLOR_MUTED   = colors.HexColor("#6B7785")
COLOR_BORDER  = colors.HexColor("#E4DED2")
COLOR_NORMAL  = colors.HexColor("#0A6E5C")
COLOR_WARN    = colors.HexColor("#C57B40")
COLOR_CRIT    = colors.HexColor("#B4452B")

DOWNLOAD_DIR = Path(__file__).resolve().parent.parent / "download"
DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)


def _severity_color(s):
    return {"normal": COLOR_NORMAL, "abnormal": COLOR_WARN, "critical": COLOR_CRIT}.get(s, COLOR_MUTED)


def _severity_label(s):
    return {"normal": "No acute finding", "abnormal": "Finding detected",
            "critical": "Critical finding"}.get(s, s.title())


def _styles():
    base = getSampleStyleSheet()
    s = {}
    s["section_head"] = ParagraphStyle("sh", parent=base["Heading2"], fontName="Helvetica-Bold",
                                        fontSize=11, textColor=COLOR_PRIMARY, leading=14,
                                        spaceAfter=6, spaceBefore=0)
    s["body"] = ParagraphStyle("body", parent=base["BodyText"], fontName="Helvetica",
                                fontSize=10, textColor=COLOR_INK, leading=14)
    s["muted"] = ParagraphStyle("muted", parent=base["BodyText"], fontName="Helvetica",
                                 fontSize=9, textColor=COLOR_MUTED, leading=12)
    s["small"] = ParagraphStyle("small", parent=base["BodyText"], fontName="Helvetica",
                                 fontSize=9, textColor=COLOR_MUTED, leading=12)
    s["note"] = ParagraphStyle("note", parent=base["BodyText"], fontName="Helvetica",
                                fontSize=10, textColor=COLOR_INK, leading=14)
    s["pred_big"] = ParagraphStyle("pred_big", parent=base["Heading1"], fontName="Helvetica-Bold",
                                    fontSize=24, textColor=COLOR_INK, leading=28, spaceAfter=4)
    s["pred_sub"] = ParagraphStyle("pred_sub", parent=base["BodyText"], fontName="Helvetica",
                                    fontSize=11, textColor=COLOR_MUTED, leading=14)
    s["disclaimer"] = ParagraphStyle("disc", parent=base["BodyText"], fontName="Helvetica-Oblique",
                                      fontSize=8, textColor=COLOR_MUTED, leading=11)
    return s


def _on_page(canv, doc):
    canv.saveState()
    page_w, page_h = A4
    header_h = 18 * mm
    canv.setFillColor(COLOR_PRIMARY)
    canv.rect(0, page_h - header_h, page_w, header_h, fill=1, stroke=0)
    canv.setFillColor(colors.white)
    canv.circle(13 * mm, page_h - 9 * mm, 2.6 * mm, fill=1, stroke=0)
    canv.setFillColor(COLOR_PRIMARY)
    canv.circle(13 * mm, page_h - 9 * mm, 1.1 * mm, fill=1, stroke=0)
    canv.setFillColor(colors.white)
    canv.setFont("Helvetica-Bold", 13)
    canv.drawString(20 * mm, page_h - 11 * mm, "RADIOMED")
    canv.setFont("Helvetica", 8.5)
    canv.setFillColor(colors.HexColor("#D7E8E1"))
    canv.drawString(20 * mm, page_h - 14.5 * mm, "Clinical Decision Support  ·  Diagnostic Report")
    canv.setFont("Helvetica", 8)
    canv.setFillColor(colors.white)
    canv.drawRightString(page_w - 13 * mm, page_h - 11 * mm, f"Report #{doc.doc_id}")
    canv.setFillColor(colors.HexColor("#D7E8E1"))
    canv.drawRightString(page_w - 13 * mm, page_h - 14.5 * mm, "CONFIDENTIAL  ·  For clinical use only")
    canv.setStrokeColor(COLOR_BORDER)
    canv.setLineWidth(0.3)
    canv.line(13 * mm, 16 * mm, page_w - 13 * mm, 16 * mm)
    canv.setFont("Helvetica-Oblique", 7.5)
    canv.setFillColor(COLOR_MUTED)
    canv.drawString(13 * mm, 10 * mm,
                    "AI-assisted image interpretation — must be reviewed by a licensed physician before clinical action.")
    canv.drawRightString(page_w - 13 * mm, 10 * mm, f"Page {doc.page}")
    canv.restoreState()


def _bar(percent, fill_color, width, height=4 * mm):
    inner_w = width * (percent / 100.0)
    inner = Table([[""]], colWidths=[inner_w], rowHeights=[height])
    inner.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), fill_color),
        ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0), ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    outer = Table([[inner]], colWidths=[width], rowHeights=[height])
    outer.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), COLOR_BG_ALT),
        ("BOX", (0, 0), (-1, -1), 0.3, COLOR_BORDER),
        ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0), ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    return outer


def _image_tile(image_bytes, caption, sub, styles, width, height):
    if not image_bytes:
        ph = Table([[""]], colWidths=[width], rowHeights=[height - 10 * mm])
        ph.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), COLOR_BG_ALT),
            ("BOX", (0, 0), (-1, -1), 0.3, COLOR_BORDER),
        ]))
        cap = Paragraph(f"<b>{caption}</b><br/><font color='#6B7785' size='8'>{sub}</font>", styles["small"])
        cell = Table([[ph], [cap]], colWidths=[width])
        cell.setStyle(TableStyle([
            ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 2), ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ]))
        return cell
    pil = PILImage.open(io.BytesIO(image_bytes))
    w, h = pil.size
    aspect = h / w
    max_w = width - 8 * mm
    max_h = height - 14 * mm
    img_w = max_w
    img_h = img_w * aspect
    if img_h > max_h:
        img_h = max_h
        img_w = img_h / aspect
    img = RLImage(io.BytesIO(image_bytes), width=img_w, height=img_h)
    img.hAlign = "CENTER"
    cap = Paragraph(f"<b>{caption}</b><br/><font color='#6B7785' size='8'>{sub}</font>", styles["small"])
    cell = Table([[img], [cap]], colWidths=[width])
    cell.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, 0), colors.HexColor("#0F1418")),
        ("LEFTPADDING", (0, 0), (-1, -1), 4), ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("BOX", (0, 0), (-1, -1), 0.3, COLOR_BORDER),
    ]))
    return cell


def generate_report(*, scan_id, patient_code, patient_name, age, sex, modality, filename,
                    clinician_name, predicted_label, confidence, severity, clinical_note,
                    probabilities, original_image_bytes, gradcam_image_bytes) -> str:
    out_path = DOWNLOAD_DIR / f"report_scan_{scan_id}.pdf"
    doc = SimpleDocTemplate(
        str(out_path), pagesize=A4,
        leftMargin=13 * mm, rightMargin=13 * mm,
        topMargin=24 * mm, bottomMargin=20 * mm,
        title=f"Radiomed Diagnostic Report — Scan {scan_id}",
        author=clinician_name,
    )
    doc.doc_id = scan_id
    styles = _styles()
    content_w = A4[0] - 26 * mm

    name_display = patient_name if patient_name else "—"
    ts = datetime.now(timezone.utc).strftime("%d %b %Y, %H:%M UTC")
    patient_rows = [
        ["Patient name", name_display, "Patient code", patient_code],
        ["Age", f"{age if age is not None else '—'} y", "Sex", sex or "—"],
        ["Modality", modality, "Reviewed by", clinician_name],
        ["Image file", filename[:36] + ("…" if len(filename) > 36 else ""), "Date", ts],
    ]
    patient_tbl = Table(patient_rows, colWidths=[28 * mm, 60 * mm, 28 * mm, content_w - 116 * mm])
    patient_tbl.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 9.5),
        ("TEXTCOLOR", (0, 0), (0, -1), COLOR_MUTED),
        ("TEXTCOLOR", (2, 0), (2, -1), COLOR_MUTED),
        ("TEXTCOLOR", (1, 0), (1, -1), COLOR_INK),
        ("TEXTCOLOR", (3, 0), (3, -1), COLOR_INK),
        ("FONTNAME", (1, 0), (1, -1), "Helvetica-Bold"),
        ("FONTNAME", (3, 0), (3, -1), "Helvetica-Bold"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("LINEBELOW", (0, 0), (-1, -2), 0.3, COLOR_BORDER),
        ("BACKGROUND", (0, 0), (-1, -1), COLOR_SURFACE),
        ("BOX", (0, 0), (-1, -1), 0.3, COLOR_BORDER),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))

    sev_color = _severity_color(severity)
    sev_label = _severity_label(severity)
    pct = max(2, min(100, int(round(confidence * 100))))

    pred_left = [
        Paragraph(f"<b>{predicted_label}</b>", styles["pred_big"]),
        Paragraph(sev_label, styles["pred_sub"]),
    ]
    pred_right_text = f"<font color='#FFFFFF'><b>{pct}%</b></font><br/><font color='#D7E8E1' size='8'>CONFIDENCE</font>"
    pred_right = Paragraph(pred_right_text, ParagraphStyle("pr", fontName="Helvetica-Bold",
                                                            fontSize=22, leading=26,
                                                            alignment=2, textColor=colors.white))
    pred_tbl = Table([[pred_left, pred_right]], colWidths=[content_w - 50 * mm, 50 * mm])
    pred_tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, 0), COLOR_SURFACE),
        ("BACKGROUND", (1, 0), (1, 0), sev_color),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (0, 0), 14), ("RIGHTPADDING", (0, 0), (0, 0), 14),
        ("LEFTPADDING", (1, 0), (1, 0), 14), ("RIGHTPADDING", (1, 0), (1, 0), 14),
        ("TOPPADDING", (0, 0), (-1, -1), 10), ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("BOX", (0, 0), (-1, -1), 0.3, COLOR_BORDER),
    ]))

    conf_row = [
        Paragraph("<b>Confidence</b>", styles["body"]),
        _bar(pct, COLOR_ACCENT, width=content_w - 50 * mm, height=5 * mm),
        Paragraph(f"<b>{pct}%</b>", styles["body"]),
    ]
    conf_tbl = Table([conf_row], colWidths=[24 * mm, content_w - 50 * mm, 26 * mm])
    conf_tbl.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (2, 0), (2, 0), "RIGHT"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6), ("TOPPADDING", (0, 0), (-1, -1), 6),
    ]))

    prob_rows = [["Class", "Probability", ""]]
    for p in probabilities:
        is_pred = (p["label"] == predicted_label)
        bar_color = COLOR_ACCENT if is_pred else COLOR_BORDER
        bar_pct = max(2, int(round(p["prob"] * 100)))
        label_html = (f"<font color='#1F2A36'><b>{p['label']}</b></font>"
                      if is_pred else f"<font color='#41506A'>{p['label']}</font>")
        pct_html = (f"<font color='#0A6E5C'><b>{p['prob']*100:.1f}%</b></font>"
                    if is_pred else f"<font color='#6B7785'>{p['prob']*100:.1f}%</font>")
        prob_rows.append([
            Paragraph(label_html, styles["body"]),
            _bar(bar_pct, bar_color, width=content_w - 80 * mm, height=4 * mm),
            Paragraph(pct_html, styles["body"]),
        ])
    prob_tbl = Table(prob_rows, colWidths=[50 * mm, content_w - 80 * mm, 30 * mm])
    prob_tbl.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("TEXTCOLOR", (0, 0), (-1, 0), COLOR_MUTED),
        ("BACKGROUND", (0, 0), (-1, 0), COLOR_BG_ALT),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (2, 0), (2, -1), "RIGHT"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5), ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 8), ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("BOX", (0, 0), (-1, -1), 0.3, COLOR_BORDER),
        ("LINEBELOW", (0, 0), (-1, -2), 0.2, COLOR_BORDER),
    ]))

    img_tile_w = (content_w - 8 * mm) / 2
    img_tile_h = 60 * mm  # compact image tiles to fit single page
    orig_tile = _image_tile(original_image_bytes, "Original image",
                            f"{modality} · 224×224 normalized", styles, img_tile_w, img_tile_h)
    grad_tile = _image_tile(gradcam_image_bytes, "Grad-CAM explainability overlay",
                             "activation heatmap" if gradcam_image_bytes else "n/a · normal finding",
                             styles, img_tile_w, img_tile_h)

    images_row = Table([[orig_tile, grad_tile]], colWidths=[img_tile_w, img_tile_w])
    images_row.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (0, 0), 4), ("RIGHTPADDING", (1, 0), (1, 0), 0),
        ("LEFTPADDING", (1, 0), (1, 0), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 0), ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))

    note_text = clinical_note if clinical_note else "No additional clinical notes recorded."
    note_block = Table([[Paragraph(note_text, styles["note"])]], colWidths=[content_w])
    note_block.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), COLOR_BG_ALT),
        ("LEFTPADDING", (0, 0), (-1, -1), 12), ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 10), ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("LINEBEFORE", (0, 0), (0, -1), 3, COLOR_PRIMARY),
        ("BOX", (0, 0), (-1, -1), 0.3, COLOR_BORDER),
    ]))

    disclaimer = Paragraph(
        "<b>Disclaimer.</b> This report was generated by an automated deep-learning pipeline and is intended "
        "for decision-support only — not a substitute for review by a qualified radiologist. Final diagnosis "
        "and treatment decisions must be made by a licensed clinician, considering full clinical context, "
        "prior imaging, and laboratory findings.",
        styles["disclaimer"]
    )

    # Wrap everything in KeepInFrame so it ALWAYS fits on one page
    # (mode="shrink" scales down content if needed to fit).
    frame_w = A4[0] - 26 * mm
    frame_h = A4[1] - 24 * mm - 20 * mm - 4 * mm  # height - top margin - bottom margin - safety

    story = [
        Paragraph("PATIENT &amp; STUDY", styles["section_head"]),
        patient_tbl,
        Spacer(1, 5 * mm),
        Paragraph("AI INTERPRETATION", styles["section_head"]),
        pred_tbl,
        Spacer(1, 2 * mm),
        conf_tbl,
        Spacer(1, 5 * mm),
        Paragraph("CLASS PROBABILITIES", styles["section_head"]),
        prob_tbl,
        Spacer(1, 5 * mm),
        Paragraph("VISUAL EVIDENCE", styles["section_head"]),
        images_row,
        Spacer(1, 5 * mm),
        Paragraph("CLINICAL NOTE", styles["section_head"]),
        note_block,
        Spacer(1, 4 * mm),
        HRFlowable(width="100%", thickness=0.3, color=COLOR_BORDER),
        Spacer(1, 2 * mm),
        disclaimer,
    ]

    framed = KeepInFrame(frame_w, frame_h, story, mode="shrink")
    doc.build([framed], onFirstPage=_on_page, onLaterPages=_on_page)
    return str(out_path)
