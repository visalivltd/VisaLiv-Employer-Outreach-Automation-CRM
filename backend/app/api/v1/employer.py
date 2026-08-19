from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.employer import (
    EmployerCreate,
    EmployerImportPreviewResponse,
    EmployerImportResultResponse,
    EmployerResponse,
    EmployerUpdate,
)
from app.services import employer_import_service, employer_service


router = APIRouter(
    prefix="/employers",
    tags=["Employers"],
)


@router.post(
    "",
    response_model=EmployerResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_employer(
    data: EmployerCreate,
    db: Session = Depends(get_db),
):
    try:
        return employer_service.create_employer(
            db,
            data,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )


@router.get(
    "",
    response_model=list[EmployerResponse],
)
def get_employers(
    db: Session = Depends(get_db),
):
    return employer_service.get_employers(db)


@router.post(
    "/preview-import",
    response_model=EmployerImportPreviewResponse,
)
async def preview_employer_import(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only Excel files (.xlsx) are allowed.",
        )
    contents = await file.read()
    try:
        return employer_import_service.preview_employer_import(db, contents)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@router.post(
    "/import",
    response_model=EmployerImportResultResponse,
)
async def execute_employer_import(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only Excel files (.xlsx) are allowed.",
        )
    contents = await file.read()
    try:
        return employer_import_service.execute_employer_import(db, contents)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@router.get(
    "/{employer_id}",
    response_model=EmployerResponse,
)
def get_employer(
    employer_id: int,
    db: Session = Depends(get_db),
):
    employer = employer_service.get_employer(
        db,
        employer_id,
    )

    if employer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employer not found",
        )

    return employer


@router.put(
    "/{employer_id}",
    response_model=EmployerResponse,
)
def update_employer(
    employer_id: int,
    data: EmployerUpdate,
    db: Session = Depends(get_db),
):
    try:
        employer = employer_service.update_employer(
            db,
            employer_id,
            data,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    if employer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employer not found",
        )

    return employer


@router.delete(
    "/{employer_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_employer(
    employer_id: int,
    db: Session = Depends(get_db),
):
    deleted = employer_service.delete_employer(
        db,
        employer_id,
    )

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employer not found",
        )