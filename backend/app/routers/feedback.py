import json
import os

import httpx
from fastapi import APIRouter, UploadFile, File, Form, HTTPException

router = APIRouter(prefix="/feedback", tags=["Feedback"])

# Discord webhook URL - stored server-side for security
DISCORD_WEBHOOK_URL = os.getenv("DISCORD_WEBHOOK_URL")


@router.post("")
async def send_feedback(
    image: UploadFile = File(...),
    page_url: str = Form(...),
    page_title: str = Form(...),
    notes: str = Form(""),
    sender_name: str = Form("Anonymous"),
):
    """Receive annotated screenshot + notes and forward to Discord webhook."""

    # Read the image bytes
    image_bytes = await image.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="No image data received")

    # Build the Discord message
    content_parts = [
        f"## 📋 Feedback from {sender_name}",
        f"**Page:** {page_title}",
        f"**URL:** {page_url}",
    ]
    if notes.strip():
        content_parts.append(f"\n**Notes:**\n{notes.strip()}")

    # Discord's payload_json must be a JSON-encoded object (e.g. {"content": "..."}),
    # not a plain text string. Wrap the message in a proper JSON payload.
    discord_payload = {
        "content": "\n".join(content_parts),
    }

    # Send to Discord via webhook with file attachment
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post(
                DISCORD_WEBHOOK_URL,
                data={"payload_json": json.dumps(discord_payload)},
                files={
                    "files[0]": (
                        "annotated-screenshot.png",
                        image_bytes,
                        image.content_type or "image/png",
                    )
                },
            )

            if response.status_code not in (200, 204):
                raise HTTPException(
                    status_code=502,
                    detail=f"Discord webhook returned error: {response.status_code} - {response.text}",
                )

        except httpx.RequestError as e:
            raise HTTPException(
                status_code=502,
                detail=f"Failed to reach Discord: {str(e)}",
            )

    return {"status": "success", "message": "Feedback sent to Discord successfully"}
