from pydantic import BaseModel


class OutreachSendRequest(BaseModel):
    candidate_id: int
    employer_id: int
    subject: str
    body: str
    draft_id: int | None = None