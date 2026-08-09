from fastapi import FastAPI

from app.core.config import settings

from app.api.v1.auth import router as auth_router
from app.api.v1.candidate import router as candidate_router


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
)

app.include_router(auth_router)
app.include_router(candidate_router)

@app.get("/")
async def root():
    return {
        "success": True,
        "message": "VisaLiv CRM Backend Running",
    }