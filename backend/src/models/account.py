from sqlalchemy import Column, String, Float, Boolean, DateTime, Enum as SQLEnum, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
import enum
from config.database import Base


class AccountType(str, enum.Enum):
    CHECKING = "CHECKING"
    SAVINGS = "SAVINGS"
    CREDIT_CARD = "CREDIT_CARD"
    CASH = "CASH"
    INVESTMENT = "INVESTMENT"


class Account(Base):
    __tablename__ = "accounts"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Account details
    name = Column(String(100), nullable=False)
    account_type = Column(SQLEnum(AccountType), nullable=False, default=AccountType.CHECKING)
    currency = Column(String(3), nullable=False, default="USD")  # ISO 4217 currency code

    # Balance tracking
    balance = Column(Float, nullable=False, default=0.0)
    initial_balance = Column(Float, nullable=False, default=0.0)

    # Credit card specific
    credit_limit = Column(Float, nullable=True)  # For credit cards

    # Account info
    institution = Column(String(100), nullable=True)  # Bank name
    account_number_last4 = Column(String(4), nullable=True)  # Last 4 digits
    color = Column(String(7), nullable=True, default="#0ea5e9")  # Hex color for UI
    icon = Column(String(50), nullable=True, default="💳")  # Emoji icon

    # Status
    is_active = Column(Boolean, default=True)
    exclude_from_total = Column(Boolean, default=False)  # Exclude from total balance calculation

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="accounts")
    transactions = relationship("Transaction", back_populates="account", cascade="all, delete-orphan")
    debts = relationship("Debt", back_populates="account")

    def __repr__(self):
        return f"<Account {self.name} ({self.account_type}): {self.currency} {self.balance}>"
