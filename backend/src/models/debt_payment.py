from sqlalchemy import Column, String, Float, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from config.database import Base


class DebtPayment(Base):
    __tablename__ = "debt_payments"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    debt_id = Column(String, ForeignKey("debts.id", ondelete="CASCADE"), nullable=False, index=True)
    account_id = Column(String, ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True)
    amount = Column(Float, nullable=False)
    note = Column(String(500), nullable=True)
    paid_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    debt = relationship("Debt", back_populates="payments")
    account = relationship("Account")

    def __repr__(self):
        return f"<DebtPayment debt={self.debt_id} amount={self.amount}>"
