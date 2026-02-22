from sqlalchemy import Column, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from config.database import Base


class Debt(Base):
    __tablename__ = "debts"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    account_id = Column(String, ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True, index=True)

    person_name = Column(String(200), nullable=False)
    amount = Column(Float, nullable=False)
    debt_type = Column(String, nullable=False)   # "DEBT" or "RECEIVABLE"
    category = Column(String(50), nullable=True)  # "PERSONAL", "BUSINESS", "LOAN"
    description = Column(String(500), nullable=True)
    personal_note = Column(String(1000), nullable=True)
    due_date = Column(DateTime(timezone=True), nullable=True)
    reminder_at = Column(DateTime(timezone=True), nullable=True)
    is_paid = Column(Boolean, default=False)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="debts")
    account = relationship("Account", back_populates="debts")
    payments = relationship(
        "DebtPayment",
        back_populates="debt",
        cascade="all, delete-orphan",
        order_by="DebtPayment.paid_at"
    )

    @property
    def paid_amount(self):
        return sum(p.amount for p in self.payments) if self.payments else 0.0

    def __repr__(self):
        return f"<Debt {self.debt_type} {self.person_name}: {self.amount}>"
