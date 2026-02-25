"""Parse receipt photos into transaction fields using Gemini vision."""

import json
import re
from typing import List, Dict

from config.settings import settings
from src.schemas.voice import VoiceParseResponse
from src.services.voice_service import _detect_language, _fuzzy_match_category


async def parse_receipt_image(image_bytes: bytes, categories: List[Dict]) -> VoiceParseResponse:
    """Use Gemini vision to extract transaction fields from a receipt image."""
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=settings.GOOGLE_GEMINI_API_KEY)
    category_names = [c["name"] for c in categories]

    prompt = f"""Analyze this receipt image. Extract the following as valid JSON:
- "amount": total amount paid (numeric, e.g., 50.00). Must be a number, not a string.
- "transaction_type": always "EXPENSE" for receipts
- "category": best match from [{', '.join(category_names)}]
- "merchant": store/company name from the receipt
- "description": brief summary of items purchased
- "confidence": 0.0-1.0 how confident you are in the extraction

If you cannot read the receipt clearly, set confidence to a low value.

Respond ONLY with valid JSON, no markdown code blocks."""

    image_part = types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg")

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=[prompt, image_part],
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

    desc = parsed.get("description", "Receipt purchase")
    return VoiceParseResponse(
        transcript=desc,
        amount=parsed.get("amount"),
        transaction_type="EXPENSE",
        category_name=category_name,
        category_id=category_id,
        merchant=parsed.get("merchant"),
        description=desc,
        confidence=parsed.get("confidence", 0.7),
        language=_detect_language(parsed.get("merchant", "") or desc),
    )
