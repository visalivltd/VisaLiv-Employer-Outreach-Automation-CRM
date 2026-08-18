from pathlib import Path
from uuid import uuid4

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile,
    status,
)
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.candidate import (
    CandidateAssignDraft,
    CandidateCreate,
    CandidateResponse,
    CandidateUpdate,
)
from app.services import candidate_service


router = APIRouter(
    prefix="/candidates",
    tags=["Candidates"],
)


# Project root /uploads directory
UPLOAD_DIR = Path(__file__).resolve().parents[4] / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".pdf", ".doc", ".docx"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


@router.post(
    "/upload-cv",
)
async def upload_cv(
    file: UploadFile = File(...),
):
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No file selected",
        )

    extension = Path(file.filename).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF, DOC, and DOCX files are allowed",
        )

    file_content = await file.read()

    if len(file_content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CV file must be 10 MB or smaller",
        )

    # Generate a unique filename so existing CVs are never overwritten.
    filename = f"{uuid4().hex}{extension}"

    file_path = UPLOAD_DIR / filename
    file_path.write_bytes(file_content)

    return {
        "success": True,
        "message": "CV uploaded successfully",
        "filename": filename,
        "file_path": f"uploads/{filename}",
    }


@router.post(
    "",
    response_model=CandidateResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_candidate(
    data: CandidateCreate,
    db: Session = Depends(get_db),
):
    try:
        return candidate_service.create_candidate(db, data)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )


@router.get(
    "",
    response_model=list[CandidateResponse],
)
def get_candidates(
    active_only: bool = False,
    db: Session = Depends(get_db),
):
    return candidate_service.get_candidates(db, active_only=active_only)


@router.get(
    "/{candidate_id}",
    response_model=CandidateResponse,
)
def get_candidate(
    candidate_id: int,
    db: Session = Depends(get_db),
):
    candidate = candidate_service.get_candidate(
        db,
        candidate_id,
    )

    if candidate is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate not found",
        )

    return candidate


@router.put(
    "/{candidate_id}",
    response_model=CandidateResponse,
)
def update_candidate(
    candidate_id: int,
    data: CandidateUpdate,
    db: Session = Depends(get_db),
):
    candidate = candidate_service.update_candidate(
        db,
        candidate_id,
        data,
    )

    if candidate is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate not found",
        )

    return candidate


@router.put(
    "/{candidate_id}/assign-draft",
    response_model=CandidateResponse,
)
def assign_email_draft(
    candidate_id: int,
    data: CandidateAssignDraft,
    db: Session = Depends(get_db),
):
    try:
        candidate = candidate_service.assign_email_draft(
            db, candidate_id, data.email_draft_id
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    if candidate is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate not found",
        )

    return candidate


@router.put(
    "/{candidate_id}/email-draft",
    response_model=CandidateResponse,
)
def update_candidate_email_draft(
    candidate_id: int,
    data: CandidateAssignDraft,
    db: Session = Depends(get_db),
):
    try:
        candidate = candidate_service.assign_email_draft(
            db, candidate_id, data.email_draft_id
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    if candidate is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate not found",
        )

    return candidate


@router.delete(
    "/{candidate_id}/email-draft",
    response_model=CandidateResponse,
)
def remove_candidate_email_draft(
    candidate_id: int,
    db: Session = Depends(get_db),
):
    candidate = candidate_service.assign_email_draft(
        db, candidate_id, None
    )

    if candidate is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate not found",
        )

    return candidate


@router.delete(
    "/{candidate_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_candidate(
    candidate_id: int,
    db: Session = Depends(get_db),
):
    try:
        deleted = candidate_service.delete_candidate(
            db,
            candidate_id,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate not found",
        )