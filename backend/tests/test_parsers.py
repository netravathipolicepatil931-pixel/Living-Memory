"""Unit tests for WhatsApp .txt/.zip parser, PDF/DOCX extractors, and upload file validation."""

import io
import zipfile
import pytest
from docx import Document

from app.utils.document_parser import extract_docx_text
from app.utils.media_utils import validate_upload_file
from app.utils.whatsapp_parser import parse_whatsapp_text, parse_whatsapp_zip


def test_parse_android_and_ios_whatsapp_text():
    raw = (
        "12/11/2026, 09:30 - Sarah: I will finalize slides 1-10 by Nov 16.\n"
        "[13/11/2026, 10:15 AM] Rahul: Docker ingestion log ready.\n"
        "13/11/2026, 10:16 - Messages and calls are end-to-end encrypted.\n"
    )
    parsed = parse_whatsapp_text(raw, "WhatsApp Chat with AI Project Team.txt")
    assert parsed["groupName"] == "AI Project Team"
    assert parsed["messageCount"] == 2
    assert set(parsed["participants"]) == {"Sarah", "Rahul"}


def test_parse_whatsapp_zip_prevents_zip_slip():
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("_chat.txt", "12/11/2026, 11:00 - Prof Meera: Review in Lab 304 on Nov 18.")
        zf.writestr("../../../etc/passwd", "evil-payload")
        zf.writestr("diagram.png", b"\x89PNG\r\n\x1a\nfake")

    res = parse_whatsapp_zip(buf.getvalue(), "AI Team.zip")
    assert res["messageCount"] == 1
    assert res["mediaCount"] == 1
    assert res["attachments"][0]["filename"] == "diagram.png"


def test_extract_docx_text_reads_paragraphs_and_tables():
    doc = Document()
    doc.add_paragraph("Final thesis submission deadline is Nov 20.")
    table = doc.add_table(rows=1, cols=2)
    table.cell(0, 0).text = "Milestone"
    table.cell(0, 1).text = "Nov 18"
    buf = io.BytesIO()
    doc.save(buf)

    text = extract_docx_text(buf.getvalue())
    assert "Nov 20" in text
    assert "Milestone | Nov 18" in text


def test_validate_upload_file_rejects_bad_extensions_and_empty():
    ext, mime = validate_upload_file("notes.pdf", b"%PDF-1.4 test content")
    assert ext == ".pdf"
    assert mime == "application/pdf"

    with pytest.raises(ValueError):
        validate_upload_file("script.exe", b"mz")
    with pytest.raises(ValueError):
        validate_upload_file("empty.txt", b"")
