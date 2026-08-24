import io
import re
from typing import Any

import openpyxl
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.candidate import Candidate
from app.schemas.candidate import (
    CandidateImportPreviewResponse,
    CandidateImportPreviewRow,
    CandidateImportResultResponse,
)

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")


def validate_email_address(email_str: str | None) -> str | None:
    if not email_str:
        return None
    cleaned = str(email_str).strip().lower()
    if not cleaned:
        return None
    if EMAIL_REGEX.match(cleaned):
        return cleaned
    return None


def normalize_header(header: str | None) -> str:
    if not header:
        return ""
    h = str(header).strip().lower()
    h = re.sub(r"\s+", " ", h)
    return h


def map_column_headers(headers: list[str]) -> dict[str, int]:
    col_map = {}
    for idx, raw_h in enumerate(headers):
        norm = normalize_header(raw_h)
        if not norm:
            continue
        if norm in ("name of the candidate", "candidate name", "full name", "fullname", "name", "candidate", "student name"):
            if "full_name" not in col_map:
                col_map["full_name"] = idx
        elif norm in ("email id", "email_id", "email", "email address", "candidate email", "student email"):
            if "email" not in col_map:
                col_map["email"] = idx
        elif norm in ("phone", "phone number", "mobile", "contact", "contact number"):
            if "phone" not in col_map:
                col_map["phone"] = idx
        elif norm in ("country", "location", "nation"):
            if "country" not in col_map:
                col_map["country"] = idx
        elif norm in ("visa type", "visa", "visatype", "visa status"):
            if "visa_type" not in col_map:
                col_map["visa_type"] = idx
        elif norm in ("cv file path", "cv path", "cv", "resume", "resume path"):
            if "cv_file_path" not in col_map:
                col_map["cv_file_path"] = idx
    return col_map


def parse_excel_file(file_contents: bytes) -> tuple[dict[str, int], list[list[Any]]]:
    try:
        wb = openpyxl.load_workbook(filename=io.BytesIO(file_contents), data_only=True)
    except Exception as exc:
        raise ValueError(f"Invalid Excel file format: {exc}") from exc

    sheet = wb.active
    rows = list(sheet.iter_rows(values_only=True))
    if not rows:
        raise ValueError("Excel file is empty")

    headers = [str(cell) if cell is not None else "" for cell in rows[0]]
    col_map = map_column_headers(headers)

    if "full_name" not in col_map and "email" not in col_map:
        raise ValueError('Excel file must contain at least "Name of the Candidate" and "Email ID" columns.')

    data_rows = rows[1:]
    return col_map, data_rows


def preview_candidate_import(
    db: Session,
    file_contents: bytes,
) -> CandidateImportPreviewResponse:
    col_map, data_rows = parse_excel_file(file_contents)

    # Fetch existing active candidates for duplicate checking
    existing_candidates = db.scalars(select(Candidate).where(Candidate.is_active.is_(True))).all()
    existing_emails = {c.email.lower() for c in existing_candidates if c.email}

    preview_rows: list[CandidateImportPreviewRow] = []
    valid_count = 0
    duplicate_count = 0
    invalid_rows_count = 0

    seen_batch_emails = set()

    for idx, row in enumerate(data_rows, start=1):
        # Ignore completely empty rows
        if not any(cell is not None and str(cell).strip() != "" for cell in row):
            continue

        def get_val(key: str) -> str | None:
            col_idx = col_map.get(key)
            if col_idx is not None and col_idx < len(row):
                val = row[col_idx]
                if val is not None:
                    s_val = str(val).strip()
                    return s_val if s_val else None
            return None

        full_name = get_val("full_name")
        raw_email = get_val("email")
        phone = get_val("phone")
        country = get_val("country")
        visa_type = get_val("visa_type")
        cv_file_path = get_val("cv_file_path")

        # Required fields validation
        if not full_name:
            invalid_rows_count += 1
            preview_rows.append(
                CandidateImportPreviewRow(
                    row_number=idx,
                    full_name=None,
                    email=raw_email,
                    phone=phone,
                    country=country,
                    visa_type=visa_type,
                    cv_file_path=cv_file_path,
                    status="Invalid",
                    status_reason="Candidate Name is required",
                )
            )
            continue

        if not raw_email:
            invalid_rows_count += 1
            preview_rows.append(
                CandidateImportPreviewRow(
                    row_number=idx,
                    full_name=full_name,
                    email=None,
                    phone=phone,
                    country=country,
                    visa_type=visa_type,
                    cv_file_path=cv_file_path,
                    status="Invalid",
                    status_reason="Email ID is required",
                )
            )
            continue

        email_normalized = validate_email_address(raw_email)
        if not email_normalized:
            invalid_rows_count += 1
            preview_rows.append(
                CandidateImportPreviewRow(
                    row_number=idx,
                    full_name=full_name,
                    email=raw_email,
                    phone=phone,
                    country=country,
                    visa_type=visa_type,
                    cv_file_path=cv_file_path,
                    status="Invalid",
                    status_reason=f"Invalid email format: '{raw_email}'",
                )
            )
            continue

        # Check for duplicates (existing in DB or duplicate in same batch)
        if email_normalized in existing_emails or email_normalized in seen_batch_emails:
            duplicate_count += 1
            preview_rows.append(
                CandidateImportPreviewRow(
                    row_number=idx,
                    full_name=full_name,
                    email=email_normalized,
                    phone=phone,
                    country=country,
                    visa_type=visa_type,
                    cv_file_path=cv_file_path,
                    status="Duplicate",
                    status_reason=f"Candidate email '{email_normalized}' already exists",
                )
            )
        else:
            valid_count += 1
            seen_batch_emails.add(email_normalized)
            preview_rows.append(
                CandidateImportPreviewRow(
                    row_number=idx,
                    full_name=full_name,
                    email=email_normalized,
                    phone=phone,
                    country=country,
                    visa_type=visa_type,
                    cv_file_path=cv_file_path,
                    status="Ready",
                    status_reason="Ready for import",
                )
            )

    return CandidateImportPreviewResponse(
        total_rows=len(preview_rows),
        valid_count=valid_count,
        duplicate_count=duplicate_count,
        invalid_rows_count=invalid_rows_count,
        rows=preview_rows,
    )


def execute_candidate_import(
    db: Session,
    file_contents: bytes,
) -> CandidateImportResultResponse:
    preview = preview_candidate_import(db, file_contents)

    imported_count = 0
    skipped_duplicates_count = 0
    invalid_rows_count = 0
    details = []

    try:
        for row in preview.rows:
            if row.status == "Invalid":
                invalid_rows_count += 1
                details.append({
                    "row_number": row.row_number,
                    "full_name": row.full_name,
                    "email": row.email,
                    "status": "Invalid",
                    "reason": row.status_reason,
                })
                continue

            if row.status == "Duplicate":
                skipped_duplicates_count += 1
                details.append({
                    "row_number": row.row_number,
                    "full_name": row.full_name,
                    "email": row.email,
                    "status": "Skipped",
                    "reason": row.status_reason,
                })
                continue

            candidate = Candidate(
                full_name=row.full_name,
                email=row.email,
                phone=row.phone,
                country=row.country,
                visa_type=row.visa_type,
                cv_file_path=row.cv_file_path or "",
                is_active=True,
            )
            db.add(candidate)
            imported_count += 1

        db.commit()
    except Exception as exc:
        db.rollback()
        raise RuntimeError(f"Database error during candidate import: {exc}") from exc

    return CandidateImportResultResponse(
        success=True,
        total_rows=preview.total_rows,
        imported_count=imported_count,
        skipped_duplicates_count=skipped_duplicates_count,
        invalid_rows_count=invalid_rows_count,
        message=f"Import completed successfully. {imported_count} candidates imported, {skipped_duplicates_count} duplicates skipped.",
        details=details,
    )
