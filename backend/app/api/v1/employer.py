from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.employer import (
    EmployerCreate,
    EmployerResponse,
    EmployerUpdate,
)
from app.services import employer_service


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
        return employer_service.create_employer(db, data)
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
    employer = employer_service.update_employer(
        db,
        employer_id,
        data,
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