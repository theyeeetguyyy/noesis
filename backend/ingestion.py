"""Document ingestion pipeline for Noesis RAG.

Turns an uploaded PDF/DOCX into clean, retrieval-ready chunks:

    PDF  ->  per-page text extraction (PyMuPDF)
          ->  markdown cleanup
          ->  structure-aware chunking (page + type metadata)
          ->  LangChain Documents (embedded by the caller)

    DOCX ->  plain text extraction via Docx2txtLoader
          ->  chunking
"""

from __future__ import annotations

import os
import re

import fitz  # PyMuPDF
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

# --- tunables (override via env) -------------------------------------------
CHUNK_SIZE = int(os.environ.get("CHUNK_SIZE", "1500"))
CHUNK_OVERLAP = int(os.environ.get("CHUNK_OVERLAP", "200"))


def _clean_markdown(md: str) -> str:
    """Light cleanup: de-hyphenate line breaks, collapse blank runs/space."""
    md = md.replace("\r\n", "\n").replace("\r", "\n")
    # join words split across line breaks: "perfor-\nmance" -> "performance"
    md = re.sub(r"(\w)-\n(\w)", r"\1\2", md)
    # collapse 3+ newlines to a paragraph break
    md = re.sub(r"\n{3,}", "\n\n", md)
    # trim trailing spaces on each line
    md = re.sub(r"[ \t]+\n", "\n", md)
    return md.strip()


def process_pdf(
    file_path: str,
    source_file: str,
) -> tuple[list[Document], dict[str, int]]:
    """Process a PDF into LangChain Documents (one per page) + stats.
    
    This uses pure text extraction via PyMuPDF.
    """
    doc = fitz.open(file_path)
    n = doc.page_count
    stats = {
        "pages": n,
        "vision_used": 0,
        "vision_skipped_cap": 0,
        "vision_failed": 0,
    }

    documents: list[Document] = []
    for i in range(n):
        page = doc[i]
        md = (page.get_text() or "").strip()
        md = _clean_markdown(md)
        if not md or len(md.strip()) < 3:
            continue
        documents.append(
            Document(
                page_content=f"## Page {i + 1}\n\n{md}",
                metadata={
                    "source_file": source_file,
                    "source": file_path,
                    "page": i,
                    "kind": "text",
                },
            )
        )
    doc.close()
    return documents, stats


def chunk_documents(documents: list[Document]) -> list[Document]:
    """Structure-aware splitting that respects markdown boundaries."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        length_function=len,
        separators=["\n## ", "\n### ", "\n\n", "\n", ". ", " ", ""],
    )
    return splitter.split_documents(documents)


def ingest_file(
    file_path: str,
    source_file: str,
    images_root: str | None = None,
) -> tuple[list[Document], dict[str, int]]:
    """Full pipeline for one file -> chunked, embed-ready Documents + stats."""
    lower = source_file.lower()
    if lower.endswith(".docx"):
        from langchain_community.document_loaders import Docx2txtLoader

        pages = Docx2txtLoader(file_path).load()
        for d in pages:
            d.metadata["source_file"] = source_file
            d.metadata["kind"] = "text"
        pages = [d for d in pages if (d.page_content or "").strip()]
        stats = {"pages": len(pages), "vision_used": 0, "vision_skipped_cap": 0, "vision_failed": 0}
        return chunk_documents(pages), stats

    pages, stats = process_pdf(file_path, source_file)
    return chunk_documents(pages), stats
