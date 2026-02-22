from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from src.schemas.debt_payment import DebtPaymentResponse


class DebtAccountInfo(BaseModel):
    id: str
    name: str
    icon: str
    currency: str

    model_config = {"from_attributes": True}


class DebtCreate(BaseModel):
    person_name: str = Field(..., min_length=1, max_length=200)
    amount: float = Field(..., gt=0)
    debt_type: str = Field(..., pattern="^(DEBT|RECEIVABLE)$")
    category: Optional[str] = Field(None, pattern="^(PERSONAL|BUSINESS|LOAN)$")
    description: Optional[str] = Field(None, max_length=500)
    personal_note: Optional[str] = Field(None, max_length=1000)
    due_date: Optional[datetime] = None
    reminder_at: Optional[datetime] = None
    account_id: Optional[str] = None


class DebtUpdate(BaseModel):
    person_name: Optional[str] = Field(None, min_length=1, max_length=200)
    amount: Optional[float] = Field(None, gt=0)
    category: Optional[str] = Field(None, pattern="^(PERSONAL|BUSINESS|LOAN)$")
    description: Optional[str] = Field(None, max_length=500)
    personal_note: Optional[str] = Field(None, max_length=1000)
    due_date: Optional[datetime] = None
    reminder_at: Optional[datetime] = None
    is_paid: Optional[bool] = None
    account_id: Optional[str] = None


class DebtResponse(BaseModel):
    id: str
    user_id: str
    account_id: Optional[str]
    account: Optional[DebtAccountInfo]
    person_name: str
    amount: float
    debt_type: str
    category: Optional[str]
    description: Optional[str]
    personal_note: Optional[str]
    due_date: Optional[datetime]
    reminder_at: Optional[datetime]
    is_paid: bool
    paid_amount: float
    payments: List[DebtPaymentResponse]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
