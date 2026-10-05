"""
Audit script to check for existing Candidate records in DB whose `cv_file_path`
exists in DB but the corresponding file is missing in persistent storage (GCS/Local).
Does NOT delete or modify any DB records.
"""
import os
from pathlib import Path
from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.candidate import Candidate
from app.services.storage_service import storage_service


def audit_candidate_cvs():
    db = SessionLocal()
    try:
        candidates = db.scalars(
            select(Candidate).where(
                Candidate.cv_file_path.isnot(None),
                Candidate.cv_file_path != "",
            )
        ).all()

        total_candidates_with_cv = len(candidates)
        valid_gcs_count = 0
        valid_local_count = 0
        missing_count = 0
        missing_records = []

        print("=" * 80)
        print(f"CANDIDATE CV PERSISTENT STORAGE AUDIT REPORT")
        print("=" * 80)
        print(f"Total Candidates with CV path in DB: {total_candidates_with_cv}\n")

        for cand in candidates:
            path_key = cand.cv_file_path.strip()
            provider = storage_service.get_storage_provider(path_key)

            if provider == "gcs":
                valid_gcs_count += 1
            elif provider == "local_disk":
                valid_local_count += 1
            else:
                missing_count += 1
                missing_records.append({
                    "candidate_id": cand.id,
                    "full_name": cand.full_name,
                    "email": cand.email,
                    "cv_file_path": path_key,
                })

        print(f"• Persistent GCS Storage Valid: {valid_gcs_count}")
        print(f"• Local Container Disk Only:   {valid_local_count}")
        print(f"• Missing from Storage:         {missing_count}")
        print("-" * 80)

        if missing_records:
            print("\nAFFECTED CANDIDATE RECORDS (Missing from persistent storage):")
            for rec in missing_records:
                print(f"  [ID: {rec['candidate_id']}] {rec['full_name']} <{rec['email']}> - {rec['cv_file_path']}")
            print("\nRECOMMENDED SAFE MIGRATION / RE-UPLOAD APPROACH:")
            print("1. Do NOT delete these DB records automatically.")
            print("2. Filter candidates by `missing` status in Candidates UI.")
            print("3. Re-upload CV files for affected candidates via Candidate Profile edit form.")
            print("   The updated `/upload-cv` endpoint now guarantees persistent GCS upload before saving.")
        else:
            print("All candidate CV references in DB exist in persistent storage!")

        print("=" * 80)
        return {
            "total": total_candidates_with_cv,
            "valid_gcs": valid_gcs_count,
            "valid_local": valid_local_count,
            "missing": missing_count,
            "missing_records": missing_records,
        }
    finally:
        db.close()


if __name__ == "__main__":
    audit_candidate_cvs()
