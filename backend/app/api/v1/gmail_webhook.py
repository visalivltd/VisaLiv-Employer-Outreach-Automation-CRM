import base64
import json
from fastapi import APIRouter, Depends, Request, Response, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.gmail_sync_service import sync_incoming_replies

router = APIRouter(
    prefix="/webhooks",
    tags=["Webhooks"],
)


@router.post("/gmail")
async def gmail_pubsub_webhook(
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Receives Google Cloud Pub/Sub push notification webhooks for Gmail updates.
    Parses base64 payload containing emailAddress and historyId.
    Triggers fast incremental sync immediately to update CRM in 1-2 seconds.
    """
    try:
        body = await request.json()
        print(f"[GMAIL WEBHOOK RECEIVED] Raw payload: {body}", flush=True)

        message = body.get("message", {})
        data_b64 = message.get("data")

        email_address = None
        history_id = None

        if data_b64:
            try:
                decoded_json = base64.b64decode(data_b64).decode("utf-8")
                parsed_data = json.loads(decoded_json)
                email_address = parsed_data.get("emailAddress")
                history_id = parsed_data.get("historyId")
                print(f"[GMAIL WEBHOOK DATA] Email: {email_address} | History ID: {history_id}", flush=True)
            except Exception as parse_err:
                print(f"[GMAIL WEBHOOK PARSE ERROR] {parse_err}", flush=True)

        # Trigger fast incremental sync
        sync_res = sync_incoming_replies(db)
        print(f"[GMAIL WEBHOOK SYNC TRIGGERED] Sync result: {sync_res.get('message')}", flush=True)

        return {
            "success": True,
            "message": "Gmail push notification processed successfully",
            "email_address": email_address,
            "history_id": history_id,
            "sync_result": sync_res.get("message"),
        }
    except Exception as exc:
        print(f"[GMAIL WEBHOOK ERROR] Failed to process webhook: {exc}", flush=True)
        # Always return 200 OK to Pub/Sub to prevent infinite retry loops on malformed messages
        return Response(
            content=json.dumps({"success": False, "error": str(exc)}),
            status_code=status.HTTP_200_OK,
            media_type="application/json",
        )
