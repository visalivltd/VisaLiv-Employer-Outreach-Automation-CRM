import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

from app.db.session import SessionLocal
from app.services import employer_service
from app.schemas.employer import EmployerResponse

def test_validate_all():
    db = SessionLocal()
    try:
        employers = employer_service.get_employers(db, active_only=False)
        print(f"Total employers in DB: {len(employers)}")

        for idx, emp in enumerate(employers, start=1):
            try:
                resp = EmployerResponse.model_validate(emp)
                print(f"[{idx}/{len(employers)}] Employer #{emp.id} ({emp.email}): VALID")
            except Exception as exc:
                print(f"[{idx}/{len(employers)}] Employer #{emp.id} ({emp.email}): INVALID -> {exc}")
    finally:
        db.close()

if __name__ == "__main__":
    test_validate_all()
