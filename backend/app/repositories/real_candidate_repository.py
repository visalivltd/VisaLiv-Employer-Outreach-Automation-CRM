import uuid
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.candidate import Candidate
from app.models.real_candidate import RealCandidate
from app.schemas.real_candidate import RealCandidateCreate, RealCandidateUpdate


def get_real_candidates(db: Session) -> list[RealCandidate]:
    statement = (
        select(RealCandidate)
        .options(
            selectinload(RealCandidate.candidates),
            selectinload(RealCandidate.summary_sender_gmail_account),
        )
        .order_by(RealCandidate.id)
    )
    return list(db.scalars(statement).all())


def get_real_candidate_by_id(db: Session, real_candidate_pk: int) -> RealCandidate | None:
    statement = (
        select(RealCandidate)
        .where(RealCandidate.id == real_candidate_pk)
        .options(
            selectinload(RealCandidate.candidates),
            selectinload(RealCandidate.summary_sender_gmail_account),
        )
    )
    return db.scalar(statement)


def get_real_candidate_by_code(db: Session, real_candidate_id: str) -> RealCandidate | None:
    statement = (
        select(RealCandidate)
        .where(RealCandidate.real_candidate_id == real_candidate_id)
        .options(
            selectinload(RealCandidate.candidates),
            selectinload(RealCandidate.summary_sender_gmail_account),
        )
    )
    return db.scalar(statement)


def create_real_candidate(db: Session, data: RealCandidateCreate) -> RealCandidate:
    code = (data.real_candidate_id or "").strip()
    if not code:
        code = f"RC-{uuid.uuid4().hex[:8].upper()}"
    existing = get_real_candidate_by_code(db, code)
    if existing:
        if data.real_candidate_id:
            raise ValueError(f"Real Candidate ID '{code}' already exists")
        code = f"RC-{uuid.uuid4().hex[:8].upper()}"

    real_cand = RealCandidate(
        real_candidate_id=code,
        name=data.name.strip(),
        email=data.email.strip().lower(),
        summary_sender_gmail_account_id=data.summary_sender_gmail_account_id,
        summary_template_subject=data.summary_template_subject.strip() if data.summary_template_subject and data.summary_template_subject.strip() else None,
        summary_template_body=data.summary_template_body.strip() if data.summary_template_body and data.summary_template_body.strip() else None,
    )
    db.add(real_cand)
    db.commit()
    db.refresh(real_cand)

    if data.candidate_ids:
        cands = db.scalars(select(Candidate).where(Candidate.id.in_(data.candidate_ids))).all()
        for cand in cands:
            cand.real_candidate_id = real_cand.id
        db.commit()
        db.refresh(real_cand)

    return get_real_candidate_by_id(db, real_cand.id)


def update_real_candidate(
    db: Session,
    real_candidate_pk: int,
    data: RealCandidateUpdate,
) -> RealCandidate | None:
    real_cand = get_real_candidate_by_id(db, real_candidate_pk)
    if real_cand is None:
        return None

    update_dict = data.model_dump(exclude_unset=True)

    if "real_candidate_id" in update_dict and update_dict["real_candidate_id"]:
        new_code = update_dict["real_candidate_id"].strip()
        if new_code != real_cand.real_candidate_id:
            existing = get_real_candidate_by_code(db, new_code)
            if existing:
                raise ValueError(f"Real Candidate ID '{new_code}' already exists")
            real_cand.real_candidate_id = new_code

    if "name" in update_dict and update_dict["name"]:
        real_cand.name = update_dict["name"].strip()

    if "email" in update_dict and update_dict["email"]:
        real_cand.email = update_dict["email"].strip().lower()

    if "summary_sender_gmail_account_id" in update_dict:
        real_cand.summary_sender_gmail_account_id = update_dict["summary_sender_gmail_account_id"]

    if "summary_template_subject" in update_dict:
        raw_subj = update_dict["summary_template_subject"]
        real_cand.summary_template_subject = raw_subj.strip() if raw_subj and raw_subj.strip() else None

    if "summary_template_body" in update_dict:
        raw_body = update_dict["summary_template_body"]
        real_cand.summary_template_body = raw_body.strip() if raw_body and raw_body.strip() else None

    if "candidate_ids" in update_dict:
        new_cand_ids = update_dict["candidate_ids"] or []
        # Clear previous candidates linked to this real candidate
        for c in list(real_cand.candidates):
            if c.id not in new_cand_ids:
                c.real_candidate_id = None

        if new_cand_ids:
            target_cands = db.scalars(select(Candidate).where(Candidate.id.in_(new_cand_ids))).all()
            for cand in target_cands:
                cand.real_candidate_id = real_cand.id

    db.commit()
    db.refresh(real_cand)
    return get_real_candidate_by_id(db, real_cand.id)


def delete_real_candidate(db: Session, real_cand: RealCandidate) -> None:
    # Unlink all linked CRM candidates safely
    for cand in list(real_cand.candidates):
        cand.real_candidate_id = None

    db.delete(real_cand)
    db.commit()
