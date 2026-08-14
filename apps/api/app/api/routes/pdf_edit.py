"""PDF text editing endpoints."""

from fastapi import APIRouter, Form, Response, UploadFile

from app.services.pdf_edit import (
    MAX_REPLACEMENT_TEXT_LENGTH,
    PdfEditError,
    insert_text_into_pdf,
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


@router.post("/insert-text")
async def insert_text(
    file: UploadFile,
    page: int = Form(..., ge=0, description="Zero-based page index"),
    anchorText: str = Form(..., description="Text run to insert into"),
    offsetInAnchor: int = Form(..., ge=0, description="Raw character offset within the anchor"),
    insertionText: str = Form(
        ...,
        max_length=MAX_REPLACEMENT_TEXT_LENGTH,
        description="Text to insert at the anchor position",
    ),
    rectX0: float | None = Form(default=None),
    rectY0: float | None = Form(default=None),
    rectX1: float | None = Form(default=None),
    rectY1: float | None = Form(default=None),
) -> Response:
    """Insert text into an existing text run of a PDF page.

    The request carries the original PDF bytes, the target page, the
    anchor text run the user clicked, the raw character offset within
    that anchor, and the text to insert. The service inserts at the
    matching position with the anchor's font/size/color/baseline,
    re-setting the single line when there is no inline room and the
    line is safe to rebuild. Returns 409 with a clear message when the
    insertion cannot be performed without overlapping existing text.
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
        result = insert_text_into_pdf(
            data,
            page,
            anchorText,
            offsetInAnchor,
            insertionText,
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