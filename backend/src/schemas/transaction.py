from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from src.models.transaction import TransactionType


class TransactionCreate(BaseModel):
    account_id: str
    category_id: Optional[str] = None
    transaction_type: TransactionType
    amount: float = Field(..., gt=0)
    description: str = Field(..., min_length=1, max_length=500)
    notes: Optional[str] = None
    transaction_date: datetime
    merchant: Optional[str] = Field(None, max_length=200)
    tags: Optional[str] = None


class TransferCreate(BaseModel):
    from_account_id: str
    to_account_id: str
    amount: float = Field(..., gt=0)
    exchange_rate: Optional[float] = Field(None, gt=0)
    description: str = Field(default="Transfer", min_length=1, max_length=500)
    notes: Optional[str] = None
    transaction_date: datetime


class TransactionUpdate(BaseModel):
    category_id: Optional[str] = None
    amount: Optional[float] = Field(None, gt=0)
    description: Optional[str] = Field(None, min_length=1, max_length=500)
    notes: Optional[str] = None
    transaction_date: Optional[datetime] = None
    merchant: Optional[str] = Field(None, max_length=200)
    tags: Optional[str] = None


class CategoryResponse(BaseModel):
    id: str
    name: str
    icon: str
    color: str

    class Config:
        from_attributes = True


class TransactionResponse(BaseModel):
    id: str
    user_id: str
    account_id: str
    category_id: Optional[str]
    transaction_type: TransactionType
    amount: float
    description: str
    notes: Optional[str]
    transaction_date: datetime
    merchant: Optional[str]
    tags: Optional[str]
    created_at: datetime
    updated_at: datetime
    category: Optional[CategoryResponse] = None

    class Config:
        from_attributes = True


class TransferResponse(BaseModel):
    expense_transaction: TransactionResponse
    income_transaction: TransactionResponse
    exchange_rate: Optional[float] = None
    from_currency: str
    to_currency: str


class TransactionWithAccount(TransactionResponse):
    account_name: str
    account_icon: str


class TransactionStats(BaseModel):
    total_income: float
    total_expense: float
    net_income: float
    transaction_count: int
    by_category: dict[str, float]
