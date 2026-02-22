import json
import re
from typing import List, Optional, Dict
from config.settings import settings
from src.schemas.voice import VoiceParseResponse


def _detect_language(text: str) -> str:
    cyrillic_count = sum(1 for c in text if '\u0400' <= c <= '\u04FF')
    return "ru" if cyrillic_count > len(text) * 0.3 else "en"


def _fuzzy_match_category(name: str, categories: List[Dict]) -> Optional[Dict]:
    """Match a category name to one in the DB list."""
    if not name:
        return None
    name_lower = name.lower().strip()
    # Exact match
    for cat in categories:
        if cat["name"].lower() == name_lower:
            return cat
    # Partial match
    for cat in categories:
        if name_lower in cat["name"].lower() or cat["name"].lower() in name_lower:
            return cat
    return None


# ─── Regex fallback parser ────────────────────────────────────────────────────

EXPENSE_KEYWORDS = [
    'spent', 'paid', 'bought', 'cost', 'purchased',
    'потратил', 'потратила', 'заплатил', 'заплатила', 'купил', 'купила',
]
INCOME_KEYWORDS = [
    'earned', 'received', 'got paid', 'salary', 'income',
    'получил', 'получила', 'зарплата', 'доход', 'заработал',
]

CATEGORY_KEYWORDS = {
    'Food & Dining': ['restaurant', 'cafe', 'food', 'dinner', 'lunch', 'breakfast', 'coffee', 'starbucks', 'ресторан', 'кафе', 'еда', 'обед', 'ужин', 'кофе'],
    'Groceries': ['grocery', 'groceries', 'supermarket', 'walmart', 'продукты', 'магазин', 'супермаркет'],
    'Transportation': ['uber', 'taxi', 'gas', 'fuel', 'metro', 'bus', 'такси', 'бензин', 'метро', 'транспорт', 'автобус'],
    'Shopping': ['shopping', 'amazon', 'store', 'mall', 'clothes', 'покупки', 'одежда', 'магазин'],
    'Entertainment': ['movie', 'cinema', 'netflix', 'spotify', 'game', 'кино', 'фильм', 'игра', 'развлечения'],
    'Bills & Utilities': ['bill', 'electricity', 'water', 'internet', 'phone', 'rent', 'счёт', 'электричество', 'вода', 'интернет', 'аренда'],
    'Health & Fitness': ['doctor', 'pharmacy', 'gym', 'hospital', 'medicine', 'врач', 'аптека', 'спортзал', 'больница', 'лекарства'],
    'Education': ['book', 'course', 'school', 'university', 'tuition', 'книга', 'курс', 'школа', 'университет', 'образование'],
    'Travel': ['hotel', 'flight', 'airbnb', 'travel', 'vacation', 'отель', 'перелёт', 'путешествие', 'отпуск'],
}


def _regex_parse(transcript: str, categories: List[Dict]) -> VoiceParseResponse:
    """Regex-based fallback parser."""
    text_lower = transcript.lower()

    # Extract amount
    amount = None
    amount_patterns = [
        r'\$\s*(\d+[\.,]?\d*)',
        r'(\d+[\.,]?\d*)\s*(?:dollars?|bucks?)',
        r'(\d+[\.,]?\d*)\s*(?:рублей|руб|сум|тысяч)',
        r'(\d+[\.,]?\d*)',
    ]
    for pattern in amount_patterns:
        match = re.search(pattern, text_lower)
        if match:
            val = match.group(1).replace(',', '.')
            try:
                amount = float(val)
                if amount > 0:
                    break
            except ValueError:
                continue

    # Detect type
    transaction_type = "EXPENSE"
    for kw in INCOME_KEYWORDS:
        if kw in text_lower:
            transaction_type = "INCOME"
            break

    # Match category
    category_name = None
    category_id = None
    for cat_name, keywords in CATEGORY_KEYWORDS.items():
        for kw in keywords:
            if kw in text_lower:
                matched = _fuzzy_match_category(cat_name, categories)
                if matched:
                    category_name = matched["name"]
                    category_id = matched["id"]
                break
        if category_name:
            break

    return VoiceParseResponse(
        transcript=transcript,
        amount=amount,
        transaction_type=transaction_type,
        category_name=category_name,
        category_id=category_id,
        merchant=None,
        description=transcript,
        confidence=0.3,
        language=_detect_language(transcript),
    )


# ─── Gemini transcription + parsing ──────────────────────────────────────────

async def transcribe_and_parse_gemini(
    audio_bytes: bytes,
    mime_type: str,
    categories: List[Dict],
) -> VoiceParseResponse:
    """Use Google Gemini to transcribe audio and extract transaction fields in one call."""
    import google.generativeai as genai

    genai.configure(api_key=settings.GOOGLE_GEMINI_API_KEY)
    model = genai.GenerativeModel("gemini-2.0-flash")

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

    response = model.generate_content([
        prompt,
        {"mime_type": mime_type, "data": audio_bytes},
    ])

    raw_text = response.text.strip()
    # Strip markdown code fences if present
    if raw_text.startswith("```"):
        raw_text = re.sub(r'^```(?:json)?\s*', '', raw_text)
        raw_text = re.sub(r'\s*```$', '', raw_text)

    parsed = json.loads(raw_text)

    # Resolve category
    category_name = parsed.get("category")
    category_id = None
    if category_name:
        matched = _fuzzy_match_category(category_name, categories)
        if matched:
            category_name = matched["name"]
            category_id = matched["id"]

    transcript = parsed.get("transcript", "")

    return VoiceParseResponse(
        transcript=transcript,
        amount=parsed.get("amount"),
        transaction_type=parsed.get("transaction_type", "EXPENSE"),
        category_name=category_name,
        category_id=category_id,
        merchant=parsed.get("merchant"),
        description=parsed.get("description", transcript),
        confidence=parsed.get("confidence", 0.8),
        language=_detect_language(transcript),
    )


async def parse_voice_audio(
    audio_bytes: bytes,
    mime_type: str,
    categories: List[Dict],
) -> VoiceParseResponse:
    """Main entry point: transcribe audio and parse into transaction fields."""
    # Try Gemini (combined transcription + parsing)
    if settings.GOOGLE_GEMINI_API_KEY:
        try:
            return await transcribe_and_parse_gemini(audio_bytes, mime_type, categories)
        except Exception as e:
            print(f"Gemini parsing failed: {e}")
            # Fall through to regex if we got a transcript somehow
            pass

    # If no API key or all failed, return an error-like response
    return VoiceParseResponse(
        transcript="",
        confidence=0.0,
        language="en",
    )
