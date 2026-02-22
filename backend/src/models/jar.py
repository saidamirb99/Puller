from sqlalchemy import Column, String, Float, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
import enum
from config.database import Base


class JarType(str, enum.Enum):
    NEC = "NEC"      # Necessities - 55%
    FFA = "FFA"      # Financial Freedom - 10%
    LTSS = "LTSS"    # Long-Term Savings - 10%
    EDU = "EDU"      # Education - 10%
    PLAY = "PLAY"    # Play - 10%
    GIVE = "GIVE"    # Give - 5%


DEFAULT_JAR_PERCENTAGES = {
    JarType.NEC: 55.0,
    JarType.FFA: 10.0,
    JarType.LTSS: 10.0,
    JarType.EDU: 10.0,
    JarType.PLAY: 10.0,
    JarType.GIVE: 5.0,
}

JAR_METADATA = {
    JarType.NEC:  {"name": "Necessities",        "icon": "🏠", "color": "#3b82f6"},
    JarType.FFA:  {"name": "Financial Freedom",   "icon": "📈", "color": "#22c55e"},
    JarType.LTSS: {"name": "Long-Term Savings",   "icon": "🏦", "color": "#6366f1"},
    JarType.EDU:  {"name": "Education",           "icon": "📚", "color": "#f59e0b"},
    JarType.PLAY: {"name": "Play",                "icon": "🎮", "color": "#ec4899"},
    JarType.GIVE: {"name": "Give",                "icon": "🎁", "color": "#14b8a6"},
}


class JarConfig(Base):
    __tablename__ = "jar_configs"
    __table_args__ = (
        UniqueConstraint("user_id", "jar_type", name="uq_user_jar_type"),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    jar_type = Column(String(10), nullable=False)
    percentage = Column(Float, nullable=False)
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="jar_configs")

    def __repr__(self):
        return f"<JarConfig {self.jar_type} {self.percentage}%>"


class JarAllocation(Base):
    __tablename__ = "jar_allocations"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    transaction_id = Column(String, ForeignKey("transactions.id", ondelete="CASCADE"), nullable=False, index=True)
    jar_type = Column(String(10), nullable=False)
    amount = Column(Float, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="jar_allocations")
    transaction = relationship("Transaction", back_populates="jar_allocations")

    def __repr__(self):
        return f"<JarAllocation {self.jar_type} {self.amount}>"
