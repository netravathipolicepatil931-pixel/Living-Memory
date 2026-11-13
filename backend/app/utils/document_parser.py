"""PDF (pypdf) and DOCX (python-docx) text extraction utilities with page references."""

from __future__ import annotations

import io
from typing import Tuple


def extract_pdf_text_with_pages(pdf_bytes: bytes) -> Tuple[str, int]:
    from pypdf import PdfReader

    reader = PdfReader(io.BytesIO(pdf_bytes))
    chunks = []
    for idx, page in enumerate(reader.pages, start=1):
        txt = (page.extract_text() or "").strip()
        if txt:
            chunks.append(f"[Page {idx}]\n{txt}")
    return "\n\n".join(chunks), len(reader.pages)


def extract_docx_text(docx_bytes: bytes) -> str:
    from docx import Document

    doc = Document(io.BytesIO(docx_bytes))
    parts = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
    for table in doc.tables:
        for row in table.rows:
            row_txt = " | ".join(cell.text.strip() for cell in row.cells if cell.text.strip())
            if row_txt:
                parts.append(row_txt)
    return "\n".join(parts)
