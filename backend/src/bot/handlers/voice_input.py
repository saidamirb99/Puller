"""Handle voice messages — download .ogg, call existing parse_voice_audio."""

import sys
from telegram import Update
from telegram.ext import ContextTypes

from src.bot.strings import get_text
from src.bot.services.transaction_service import (
    get_db,
    get_telegram_user,
    get_user_categories,
)
from src.bot.services.text_parse_service import parse_text_transaction
from src.bot.handlers.confirm import send_confirmation


async def handle_voice(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Download voice .ogg, transcribe with Gemini, show confirmation."""
    chat_id = update.effective_chat.id

    db = get_db()
    try:
        tg_user = get_telegram_user(db, chat_id)
        if not tg_user or not tg_user.is_active:
            lang = "en"
            await update.message.reply_text(
                get_text(lang, "not_linked"), parse_mode="Markdown",
            )
            return

        lang = tg_user.language
        categories = get_user_categories(db, tg_user.user_id)
    finally:
        db.close()

    processing_msg = await update.message.reply_text(
        "🎙 Processing voice..." if lang == "en" else "🎙 Обработка голоса...",
    )

    try:
        voice = update.message.voice
        file = await context.bot.get_file(voice.file_id)
        audio_bytes = await file.download_as_bytearray()
        print(f"[voice] downloaded {len(audio_bytes)} bytes", flush=True)

        # Use Gemini to transcribe audio directly
        from google import genai
        from google.genai import types
        from config.settings import settings
        import json, re

        client = genai.Client(api_key=settings.GOOGLE_GEMINI_API_KEY)
        category_names = [c["name"] for c in categories]

        prompt = f"""Listen to this audio. The user is describing a financial transaction.

Extract the following as valid JSON:
- "transcript": the exact words spoken
- "amount": numeric amount (e.g., 50.00). Must be a number, not a string.
- "transaction_type": "INCOME" or "EXPENSE"
- "category": best match from [{', '.join(category_names)}]
- "merchant": store/company name if mentioned, or null
- "description": a short description of the transaction
- "confidence": 0.0-1.0 how confident you are in the extraction

Respond ONLY with valid JSON, no markdown code blocks."""

        audio_part = types.Part.from_bytes(
            data=bytes(audio_bytes),
            mime_type=voice.mime_type or "audio/ogg",
        )

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[prompt, audio_part],
        )

        raw_text = response.text.strip()
        print(f"[voice] Gemini response: {raw_text[:200]}", flush=True)

        if raw_text.startswith("```"):
            raw_text = re.sub(r'^```(?:json)?\s*', '', raw_text)
            raw_text = re.sub(r'\s*```$', '', raw_text)

        parsed_json = json.loads(raw_text)

        from src.services.voice_service import _fuzzy_match_category, _detect_language
        from src.schemas.voice import VoiceParseResponse

        category_name = parsed_json.get("category")
        category_id = None
        if category_name:
            matched = _fuzzy_match_category(category_name, categories)
            if matched:
                category_name = matched["name"]
                category_id = matched["id"]

        transcript = parsed_json.get("transcript", "")

        parsed = VoiceParseResponse(
            transcript=transcript,
            amount=parsed_json.get("amount"),
            transaction_type=parsed_json.get("transaction_type", "EXPENSE"),
            category_name=category_name,
            category_id=category_id,
            merchant=parsed_json.get("merchant"),
            description=parsed_json.get("description", transcript),
            confidence=parsed_json.get("confidence", 0.8),
            language=_detect_language(transcript),
        )

    except Exception as e:
        print(f"[voice] error: {e}", file=sys.stderr, flush=True)
        # Fallback: if we got a transcript, try parsing it as text
        await processing_msg.edit_text(
            get_text(lang, "generic_error") + f"\n\n`{e}`",
            parse_mode="Markdown",
        )
        return

    try:
        await processing_msg.delete()
    except Exception:
        pass

    if not parsed.amount:
        # Show transcript so user knows what was heard
        msg = get_text(lang, "parse_error")
        if parsed.transcript:
            msg += f"\n\nHeard: _{parsed.transcript}_"
        await update.message.reply_text(msg, parse_mode="Markdown")
        return

    await send_confirmation(update, context, parsed, chat_id, lang)
