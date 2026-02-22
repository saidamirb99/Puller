from pydantic import BaseModel
from typing import Optional


class VoiceParseResponse(BaseModel):
    transcript: str
    amount: Optional[float] = None
    transaction_type: Optional[str] = None  # "INCOME" or "EXPENSE"
    category_name: Optional[str] = None
    category_id: Optional[str] = None
    merchant: Optional[str] = None
    description: Optional[str] = None
    confidence: float = 0.0
    language: Optional[str] = None
