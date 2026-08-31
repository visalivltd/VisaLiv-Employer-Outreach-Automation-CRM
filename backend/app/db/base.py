from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


from app.models.admin import Admin
from app.models.candidate import Candidate
from app.models.employer import Employer
from app.models.gmail_account import GmailAccount
from app.models.email_log import EmailLog
from app.models.scheduler_job import SchedulerJob
from app.models.outreach_job import OutreachJob
from app.models.outreach_settings import OutreachSettings
from app.models.email_draft import EmailDraft
from app.models.notification import Notification
from app.models.real_candidate import RealCandidate
from app.models.oauth_state import OAuthState
from app.models.system_gmail_account import SystemGmailAccount
