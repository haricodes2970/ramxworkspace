"""PDF text editing endpoints."""

from fastapi import APIRouter, Form, Response, UploadFile

from app.services.pdf_edit import (
    MAX_REPLACEMENT_TEXT_LENGTH,
    PdfEditError,
    replace_text_in_pdf,
)

router = APIRouter(prefix="/pdf", tags=["pdf"])

MAX_UPLOAD_BYTES = 30 * 1024 * 1024


@router.post("/edit-text")
async def edit_text(
    file: UploadFile,
    page: int = Form(..., ge=0, description="Zero-based page index"),
    originalText: str = Form(..., description="Text to replace"),
    replacementText: str = Form(
        default="",
        max_length=MAX_REPLACEMENT_TEXT_LENGTH,
        description="Replacement text (empty deletes the original)",
    ),
    rectX0: float | None = Form(default=None),
    rectY0: float | None = Form(default=None),
    rectX1: float | None = Form(default=None),
    rectY1: float | None = Form(default=None),
) -> Response:
    """Replace existing text in a PDF and return the modified document.

    The request carries the original PDF bytes, the target page, the
    exact original text, and an approximate rectangle (PDF coordinates,
    bottom-left origin) used to disambiguate repeated occurrences.
    """
    data = await file.read()
    approx_rect = None
    if None not in (rectX0, rectY0, rectX1, rectY1):
        approx_rect = (rectX0, rectY0, rectX1, rectY1)

    try:
        if not data or len(data) > MAX_UPLOAD_BYTES:
            raise PdfEditError(
                f"PDF must be between 1 byte and {MAX_UPLOAD_BYTES // (1024 * 1024)} MB.",
                status=413,
            )
        result = replace_text_in_pdf(
            data,
            page,
            originalText,
            replacementText,
            approx_rect,
        )
    except PdfEditError as error:
        from fastapi import HTTPException

        raise HTTPException(status_code=error.status, detail=error.message) from error

    return Response(
        content=result,
        media_type="application/pdf",
        headers={"Content-Disposition": 'inline; filename="edited.pdf"'},
    )