from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.email_draft import (
    EmailDraftCreate,
    EmailDraftResponse,
    EmailDraftUpdate,
)
from app.services import email_draft_service


router = APIRouter(
    prefix="/email-drafts",
    tags=["Email Drafts"],
)

DRAFT_UPLOAD_DIR = Path(__file__).resolve().parents[4] / "uploads" / "drafts"
DRAFT_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_ATTACHMENT_EXTENSIONS = {".pdf", ".doc", ".docx"}
MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024  # 10 MB


@router.post(
    "/upload-attachment",
)
async def upload_draft_attachment(
    file: UploadFile = File(...),
):
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No file selected",
        )

    extension = Path(file.filename).suffix.lower()

    if extension not in ALLOWED_ATTACHMENT_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF, DOC, and DOCX files are allowed for draft attachments",
        )

    file_content = await file.read()

    if len(file_content) > MAX_ATTACHMENT_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Draft attachment must be 10 MB or smaller",
        )

    saved_filename = f"{uuid4().hex}{extension}"
    file_path = DRAFT_UPLOAD_DIR / saved_filename
    file_path.write_bytes(file_content)

    return {
        "success": True,
        "message": "Attachment uploaded successfully",
        "original_filename": file.filename,
        "attachment_filename": file.filename,
        "attachment_path": f"uploads/drafts/{saved_filename}",
    }


@router.post(
    "",
    response_model=EmailDraftResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_email_draft(
    data: EmailDraftCreate,
    db: Session = Depends(get_db),
):
    try:
        return email_draft_service.create_email_draft(db, data)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )


@router.get(
    "",
    response_model=list[EmailDraftResponse],
)
def get_email_drafts(
    db: Session = Depends(get_db),
):
    return email_draft_service.get_email_drafts(db)


@router.get(
    "/{draft_id}",
    response_model=EmailDraftResponse,
)
def get_email_draft(
    draft_id: int,
    db: Session = Depends(get_db),
):
    draft = email_draft_service.get_email_draft(db, draft_id)
    if draft is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email draft not found",
        )
    return draft


@router.put(
    "/{draft_id}",
    response_model=EmailDraftResponse,
)
def update_email_draft(
    draft_id: int,
    data: EmailDraftUpdate,
    db: Session = Depends(get_db),
):
    try:
        draft = email_draft_service.update_email_draft(db, draft_id, data)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    if draft is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email draft not found",
        )

    return draft


@router.delete(
    "/{draft_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_email_draft(
    draft_id: int,
    db: Session = Depends(get_db),
):
    deleted = email_draft_service.delete_email_draft(db, draft_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email draft not found",
        )
