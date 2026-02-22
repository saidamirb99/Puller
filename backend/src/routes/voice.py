from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from config.database import get_db
from config.settings import settings
from src.models.user import User
from src.models.category import Category
from src.schemas.voice import VoiceParseResponse
from src.services.voice_service import parse_voice_audio
from src.routes.auth import get_current_user_dependency

router = APIRouter()

ALLOWED_AUDIO_TYPES = {
    "audio/webm", "audio/wav", "audio/mp3", "audio/ogg",
    "audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/aac",
    "video/webm",  # some browsers send webm as video/webm
}


@router.post("/parse-transaction", response_model=VoiceParseResponse)
async def parse_voice_transaction(
    audio: UploadFile = File(...),
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db),
):
    """Receive audio, transcribe with AI, parse into transaction fields."""
    # Check API key
    if not settings.GOOGLE_GEMINI_API_KEY:
        raise HTTPException(status_code=503, detail="Voice input not configured (missing API key)")

    # Validate file type
    content_type = audio.content_type or ""
    if content_type not in ALLOWED_AUDIO_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported audio type: {content_type}")

    # Read and validate size
    audio_bytes = await audio.read()
    max_bytes = settings.VOICE_MAX_AUDIO_SIZE_MB * 1024 * 1024
    if len(audio_bytes) > max_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"Audio file too large (max {settings.VOICE_MAX_AUDIO_SIZE_MB}MB)",
        )

    if len(audio_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty audio file")

    # Get categories for context
    categories = db.query(Category).filter(Category.is_active == True).all()
    category_list = [{"id": c.id, "name": c.name} for c in categories]

    # Parse
    try:
        result = await parse_voice_audio(audio_bytes, content_type, category_list)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Voice processing failed: {str(e)}")

    if not result.transcript:
        raise HTTPException(status_code=422, detail="Could not transcribe audio - no speech detected")

    return result
