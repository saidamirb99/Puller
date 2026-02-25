import uuid
from sqlalchemy import Column, String, BigInteger, Boolean, ForeignKey, DateTime
from sqlalchemy.sql import func
from config.database import Base


class TelegramUser(Base):
    __tablename__ = "telegram_users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    telegram_chat_id = Column(BigInteger, unique=True, index=True, nullable=False)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    default_account_id = Column(String, ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True)
    language = Column(String(2), default="en")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
