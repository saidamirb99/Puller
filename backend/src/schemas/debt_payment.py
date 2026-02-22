from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class DebtPaymentCreate(BaseModel):
    amount: float = Field(..., gt=0)
    account_id: Optional[str] = None
    note: Optional[str] = Field(None, max_length=500)
    paid_at: Optional[datetime] = None


class DebtPaymentResponse(BaseModel):
    id: str
    debt_id: str
    account_id: Optional[str]
    amount: float
    note: Optional[str]
    paid_at: datetime

    model_config = {"from_attributes": True}
