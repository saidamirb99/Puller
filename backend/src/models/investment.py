import enum
import uuid
from sqlalchemy import Column, String, Float, DateTime, Boolean, ForeignKey, Enum as SQLEnum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from config.database import Base


class AssetType(str, enum.Enum):
    STOCK = "STOCK"
    ETF = "ETF"


class InvestmentTxnType(str, enum.Enum):
    BUY = "BUY"
    SELL = "SELL"


class InvestmentHolding(Base):
    __tablename__ = "investment_holdings"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    ticker = Column(String(20), nullable=False)
    name = Column(String(200), nullable=False)
    asset_type = Column(SQLEnum(AssetType), nullable=False, default=AssetType.STOCK)
    total_shares = Column(Float, nullable=False, default=0.0)
    avg_cost = Column(Float, nullable=False, default=0.0)
    realized_pnl = Column(Float, nullable=False, default=0.0)
    notes = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="investment_holdings")
    transactions = relationship("InvestmentTransaction", back_populates="holding", cascade="all, delete-orphan",
                                order_by="InvestmentTransaction.txn_date.desc()")

    def __repr__(self):
        return f"<InvestmentHolding {self.ticker} ({self.total_shares} shares)>"


class InvestmentTransaction(Base):
    __tablename__ = "investment_transactions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    holding_id = Column(String, ForeignKey("investment_holdings.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    txn_type = Column(SQLEnum(InvestmentTxnType), nullable=False)
    shares = Column(Float, nullable=False)
    price_per_share = Column(Float, nullable=False)
    total_amount = Column(Float, nullable=False)
    fees = Column(Float, nullable=False, default=0.0)
    txn_date = Column(DateTime(timezone=True), nullable=False)
    notes = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    holding = relationship("InvestmentHolding", back_populates="transactions")

    def __repr__(self):
        return f"<InvestmentTransaction {self.txn_type.value} {self.shares}x{self.price_per_share}>"
