import io
import fitz  # PyMuPDF
import pdfplumber


def extract_from_pdf(content: bytes, filename: str) -> dict:
    """Extract text and tables from PDF using PyMuPDF + pdfplumber."""
    result = {"filename": filename, "pages": []}

    pdf_fitz = fitz.open(stream=content, filetype="pdf")

    with pdfplumber.open(io.BytesIO(content)) as pdf_plumb:
        for page_num, (fitz_page, plumb_page) in enumerate(
            zip(pdf_fitz, pdf_plumb.pages)
        ):
            page_data = {
                "page": page_num + 1,
                "text": fitz_page.get_text("text").strip(),
                "tables": [],
            }

            tables = plumb_page.extract_tables()
            for table in tables:
                if table:
                    table_text = "\n".join(
                        " | ".join(str(cell or "").strip() for cell in row)
                        for row in table
                        if any(cell for cell in row)
                    )
                    if table_text.strip():
                        page_data["tables"].append(table_text)

            result["pages"].append(page_data)

    pdf_fitz.close()
    return result
