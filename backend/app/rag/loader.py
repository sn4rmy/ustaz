from io import BytesIO
from pathlib import Path

from pypdf import PdfReader
from pypdf.errors import PdfReadError

SUPPORTED_EXTENSIONS = {".pdf", ".md", ".txt"}


# The message is an error code that the API returns as is.
class MaterialError(Exception):
    pass


def extract_text(filename: str, data: bytes) -> str:
    extension = Path(filename).suffix.lower()
    if extension not in SUPPORTED_EXTENSIONS:
        raise MaterialError("unsupported_file_type")
    try:
        if extension == ".pdf":
            reader = PdfReader(BytesIO(data))
            return "\n\n".join(page.extract_text() or "" for page in reader.pages)
        # utf-8-sig also handles files saved with a BOM by Windows editors.
        return data.decode("utf-8-sig")
    except (PdfReadError, UnicodeDecodeError):
        raise MaterialError("unreadable_file") from None
