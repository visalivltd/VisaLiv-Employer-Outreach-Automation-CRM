import html
import io
import re
from typing import Any

import openpyxl
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.employer import Employer
from app.repositories import employer_repository
from app.schemas.employer import (
    EmployerImportPreviewResponse,
    EmployerImportPreviewRow,
    EmployerImportResultResponse,
)

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")


def validate_email_address(email_str: str | None) -> str | None:
    if not email_str:
        return None
    cleaned = str(email_str).strip()
    if not cleaned:
        return None
    if EMAIL_REGEX.match(cleaned):
        return cleaned
    return None


def extract_first_valid_email(raw_value: Any) -> str | None:
    if raw_value is None:
        return None
    text = str(raw_value).strip()
    if not text:
        return None

    # Replace separators ;, \n, / with comma
    normalized_text = text.replace(";", ",").replace("\n", ",").replace("/", ",")
    parts = normalized_text.split(",")

    for part in parts:
        cleaned_part = part.strip()
        valid = validate_email_address(cleaned_part)
        if valid:
            return valid

    return None


def select_primary_email_from_fields(
    hr_val: Any,
    recruitment_val: Any,
    careers_val: Any,
    manager_val: Any,
    info_val: Any,
    general_val: Any,
) -> tuple[str | None, str | None, dict[str, str | None]]:
    """Evaluates emails in strict priority order:
    1. HR Email
    2. Recruitment Email
    3. Careers Email
    4. Manager Email
    5. Info Email
    6. General Email
    Returns (primary_email, primary_email_type, parsed_dict)
    """
    hr_email = extract_first_valid_email(hr_val)
    recruitment_email = extract_first_valid_email(recruitment_val)
    careers_email = extract_first_valid_email(careers_val)
    manager_email = extract_first_valid_email(manager_val)
    info_email = extract_first_valid_email(info_val)
    general_email = extract_first_valid_email(general_val)

    parsed_dict = {
        "hr_email": hr_email,
        "recruitment_email": recruitment_email,
        "careers_email": careers_email,
        "manager_email": manager_email,
        "info_email": info_email,
        "general_email": general_email,
    }

    if hr_email:
        return hr_email, "HR", parsed_dict
    if recruitment_email:
        return recruitment_email, "Recruitment", parsed_dict
    if careers_email:
        return careers_email, "Careers", parsed_dict
    if manager_email:
        return manager_email, "Manager", parsed_dict
    if info_email:
        return info_email, "Info", parsed_dict
    if general_email:
        return general_email, "General", parsed_dict

    return None, None, parsed_dict


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
        if norm in ("service name", "servicename", "company name", "company", "employer name", "employer"):
            col_map["service_name"] = idx
        elif norm in ("service website", "servicewebsite", "website", "url", "site"):
            col_map["service_website"] = idx
        elif norm in ("hr email", "hremail", "hr"):
            col_map["hr_email"] = idx
        elif norm in ("recruitment email", "recruitmentemail", "recruitment"):
            col_map["recruitment_email"] = idx
        elif norm in ("careers email", "careersemail", "careers", "career email"):
            col_map["careers_email"] = idx
        elif norm in ("manager email", "manageremail", "manager"):
            col_map["manager_email"] = idx
        elif norm in ("info email", "infoemail", "info"):
            col_map["info_email"] = idx
        elif norm in ("general email", "generalemail", "general", "email", "primary email", "contact email"):
            # Only set general_email if not already assigned a more specific header
            if "general_email" not in col_map:
                col_map["general_email"] = idx
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

    if "service_name" not in col_map:
        raise ValueError('Required column "Service Name" is missing.')

    data_rows = rows[1:]
    return col_map, data_rows


def preview_employer_import(
    db: Session,
    file_contents: bytes,
) -> EmployerImportPreviewResponse:
    col_map, data_rows = parse_excel_file(file_contents)

    # Fetch existing active employers for duplicate check
    existing_employers = db.scalars(select(Employer).where(Employer.is_active.is_(True))).all()
    existing_emails = {e.email.lower() for e in existing_employers if e.email}
    existing_names = {e.service_name.lower() for e in existing_employers if e.service_name}
    existing_specific_emails = set()
    for e in existing_employers:
        for f in (e.hr_email, e.recruitment_email, e.careers_email, e.manager_email, e.info_email, e.general_email):
            if f:
                existing_specific_emails.add(f.lower())

    preview_rows: list[EmployerImportPreviewRow] = []
    valid_count = 0
    duplicate_count = 0
    no_email_count = 0
    invalid_rows_count = 0

    seen_batch_names = set()
    seen_batch_emails = set()

    for idx, row in enumerate(data_rows, start=1):
        def get_val(key: str) -> Any:
            col_idx = col_map.get(key)
            if col_idx is not None and col_idx < len(row):
                return row[col_idx]
            return None

        raw_name = get_val("service_name")
        service_name = str(raw_name).strip() if raw_name is not None and str(raw_name).strip() else None

        if not service_name:
            invalid_rows_count += 1
            preview_rows.append(
                EmployerImportPreviewRow(
                    row_number=idx,
                    service_name=None,
                    service_website=None,
                    primary_email=None,
                    primary_email_type=None,
                    status="Invalid",
                    status_reason="Service Name is empty",
                )
            )
            continue

        raw_website = get_val("service_website")
        service_website = str(raw_website).strip() if raw_website is not None and str(raw_website).strip() else None

        hr_val = get_val("hr_email")
        rec_val = get_val("recruitment_email")
        car_val = get_val("careers_email")
        man_val = get_val("manager_email")
        inf_val = get_val("info_email")
        gen_val = get_val("general_email")

        primary_email, email_type, parsed_dict = select_primary_email_from_fields(
            hr_val, rec_val, car_val, man_val, inf_val, gen_val
        )

        name_lower = service_name.lower()
        email_lower = primary_email.lower() if primary_email else None

        # Check duplicate
        is_duplicate = False
        dup_reason = ""
        if email_lower and (email_lower in existing_emails or email_lower in existing_specific_emails or email_lower in seen_batch_emails):
            is_duplicate = True
            dup_reason = f"Employer email '{primary_email}' already exists"
        elif name_lower in existing_names or name_lower in seen_batch_names:
            is_duplicate = True
            dup_reason = f"Service Name '{service_name}' already exists"

        if is_duplicate:
            duplicate_count += 1
            status = "Duplicate"
            reason = dup_reason
        elif primary_email is None:
            no_email_count += 1
            status = "No Email"
            reason = "No valid email found in row (imported without email)"
            seen_batch_names.add(name_lower)
        else:
            valid_count += 1
            status = "Ready"
            reason = "Ready for import"
            seen_batch_names.add(name_lower)
            seen_batch_emails.add(email_lower)

        preview_rows.append(
            EmployerImportPreviewRow(
                row_number=idx,
                service_name=service_name,
                service_website=service_website,
                primary_email=primary_email,
                primary_email_type=email_type,
                hr_email=parsed_dict["hr_email"],
                recruitment_email=parsed_dict["recruitment_email"],
                careers_email=parsed_dict["careers_email"],
                manager_email=parsed_dict["manager_email"],
                info_email=parsed_dict["info_email"],
                general_email=parsed_dict["general_email"],
                status=status,
                status_reason=reason,
            )
        )

    return EmployerImportPreviewResponse(
        total_rows=len(data_rows),
        valid_count=valid_count,
        duplicate_count=duplicate_count,
        no_email_count=no_email_count,
        invalid_rows_count=invalid_rows_count,
        rows=preview_rows,
    )


def execute_employer_import(
    db: Session,
    file_contents: bytes,
) -> EmployerImportResultResponse:
    preview = preview_employer_import(db, file_contents)

    # Get current max import_order in DB
    max_order = db.scalar(select(func.max(Employer.import_order))) or 0

    imported_count = 0
    skipped_duplicates_count = 0
    no_email_count = 0
    invalid_rows_count = 0
    details = []

    try:
        for row in preview.rows:
            if row.status == "Invalid":
                invalid_rows_count += 1
                details.append({"row_number": row.row_number, "status": "Invalid", "reason": row.status_reason})
                continue
            if row.status == "Duplicate":
                skipped_duplicates_count += 1
                details.append({"row_number": row.row_number, "service_name": row.service_name, "status": "Skipped", "reason": row.status_reason})
                continue

            max_order += 1
            emp = Employer(
                service_name=row.service_name,
                email=row.primary_email,
                service_website=row.service_website,
                hr_email=row.hr_email,
                recruitment_email=row.recruitment_email,
                careers_email=row.careers_email,
                manager_email=row.manager_email,
                info_email=row.info_email,
                general_email=row.general_email,
                primary_email_type=row.primary_email_type,
                import_order=max_order,
                is_active=True,
            )
            db.add(emp)
            imported_count += 1

            if row.status == "No Email":
                no_email_count += 1

        db.commit()
    except Exception as exc:
        db.rollback()
        raise RuntimeError(f"Database error during employer import: {exc}") from exc

    return EmployerImportResultResponse(
        success=True,
        total_rows=preview.total_rows,
        imported_count=imported_count,
        skipped_duplicates_count=skipped_duplicates_count,
        no_email_count=no_email_count,
        invalid_rows_count=invalid_rows_count,
        message=f"Import completed successfully. {imported_count} imported, {skipped_duplicates_count} duplicates skipped.",
        details=details,
    )
