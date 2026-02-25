"""Parse plain text messages into transaction fields using Gemini."""

import json
import re
from typing import List, Dict

from config.settings import settings
from src.schemas.voice import VoiceParseResponse
from src.services.voice_service import _detect_language, _fuzzy_match_category, _regex_parse


async def parse_text_transaction(text: str, categories: List[Dict]) -> VoiceParseResponse:
    """Parse a text message into transaction fields. Gemini first, regex fallback."""
    if settings.GOOGLE_GEMINI_API_KEY:
        try:
            return await _gemini_parse_text(text, categories)
        except Exception as e:
            print(f"Gemini text parsing failed: {e}")

    return _regex_parse(text, categories)


async def _gemini_parse_text(text: str, categories: List[Dict]) -> VoiceParseResponse:
    """Use Gemini to extract transaction fields from text."""
    from google import genai

    client = genai.Client(api_key=settings.GOOGLE_GEMINI_API_KEY)
    category_names = [c["name"] for c in categories]

    prompt = f"""The user typed a financial transaction message. Extract the following as valid JSON:
- "amount": numeric amount (e.g., 50.00). Must be a number, not a string.
- "transaction_type": "INCOME" or "EXPENSE"
- "category": best match from [{', '.join(category_names)}]
- "merchant": store/company name if mentioned, or null
- "description": a short description of the transaction
- "confidence": 0.0-1.0 how confident you are

User message: "{text}"

Respond ONLY with valid JSON, no markdown code blocks."""

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=[prompt],
    )

    raw_text = response.text.strip()
    if raw_text.startswith("```"):
        raw_text = re.sub(r'^```(?:json)?\s*', '', raw_text)
        raw_text = re.sub(r'\s*```$', '', raw_text)

    parsed = json.loads(raw_text)

    category_name = parsed.get("category")
    category_id = None
    if category_name:
        matched = _fuzzy_match_category(category_name, categories)
        if matched:
            category_name = matched["name"]
            category_id = matched["id"]

    return VoiceParseResponse(
        transcript=text,
        amount=parsed.get("amount"),
        transaction_type=parsed.get("transaction_type", "EXPENSE"),
        category_name=category_name,
        category_id=category_id,
        merchant=parsed.get("merchant"),
        description=parsed.get("description", text),
        confidence=parsed.get("confidence", 0.8),
        language=_detect_language(text),
    )
