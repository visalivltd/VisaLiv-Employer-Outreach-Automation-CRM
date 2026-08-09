from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


# Import all models here so Alembic can detect them

# from app.models.admin import Admin
# from app.models.candidate import Candidate
# from app.models.employer import Employer
# from app.models.gmail_account import GmailAccount
# from app.models.email_log import EmailLog
# from app.models.scheduler_job import SchedulerJob