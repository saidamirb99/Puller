from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Optional
from src.models.account import AccountType


class AccountCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    account_type: AccountType
    currency: str = Field(default="USD", min_length=3, max_length=3)
    initial_balance: float = Field(default=0.0)
    credit_limit: Optional[float] = None
    institution: Optional[str] = Field(None, max_length=100)
    account_number_last4: Optional[str] = Field(None, min_length=4, max_length=4)
    color: Optional[str] = Field(default="#0ea5e9", pattern="^#[0-9A-Fa-f]{6}$")
    icon: Optional[str] = Field(default="💳", max_length=50)
    exclude_from_total: bool = False

    @field_validator('currency')
    @classmethod
    def currency_uppercase(cls, v: str) -> str:
        return v.upper()


class AccountUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    institution: Optional[str] = Field(None, max_length=100)
    account_number_last4: Optional[str] = Field(None, min_length=4, max_length=4)
    color: Optional[str] = Field(None, pattern="^#[0-9A-Fa-f]{6}$")
    icon: Optional[str] = Field(None, max_length=50)
    credit_limit: Optional[float] = None
    exclude_from_total: Optional[bool] = None
    is_active: Optional[bool] = None


class AccountResponse(BaseModel):
    id: str
    user_id: str
    name: str
    account_type: AccountType
    currency: str
    balance: float
    initial_balance: float
    credit_limit: Optional[float]
    institution: Optional[str]
    account_number_last4: Optional[str]
    color: str
    icon: str
    is_active: bool
    exclude_from_total: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AccountSummary(BaseModel):
    total_accounts: int
    total_balance: float
    total_balance_by_currency: dict[str, float]
    accounts_by_type: dict[str, int]
