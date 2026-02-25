"""Database operations for the Telegram bot."""

import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict

from sqlalchemy.orm import Session
from config.database import SessionLocal
from src.models.user import User
from src.models.account import Account
from src.models.transaction import Transaction, TransactionType
from src.models.category import Category
from src.models.jar import JarConfig, JarAllocation, JarType, DEFAULT_JAR_PERCENTAGES
from src.bot.models import TelegramUser


def get_db() -> Session:
    """Get a new DB session (caller must close)."""
    return SessionLocal()


# ─── TelegramUser helpers ──────────────────────────────────────────────────

def get_telegram_user(db: Session, chat_id: int) -> Optional[TelegramUser]:
    return db.query(TelegramUser).filter(TelegramUser.telegram_chat_id == chat_id).first()


def create_telegram_user(
    db: Session,
    chat_id: int,
    user_id: str,
    language: str = "en",
    default_account_id: Optional[str] = None,
) -> TelegramUser:
    tg_user = TelegramUser(
        id=str(uuid.uuid4()),
        telegram_chat_id=chat_id,
        user_id=user_id,
        default_account_id=default_account_id,
        language=language,
    )
    db.add(tg_user)
    db.commit()
    db.refresh(tg_user)
    return tg_user


# ─── User / Auth helpers ──────────────────────────────────────────────────

def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()


# ─── Account helpers ───────────────────────────────────────────────────────

def get_user_accounts(db: Session, user_id: str) -> List[Account]:
    return db.query(Account).filter(
        Account.user_id == user_id,
        Account.is_active == True,
    ).all()


def get_account_by_id(db: Session, account_id: str) -> Optional[Account]:
    return db.query(Account).filter(Account.id == account_id).first()


def get_default_account(db: Session, tg_user: TelegramUser) -> Optional[Account]:
    if tg_user.default_account_id:
        acc = get_account_by_id(db, tg_user.default_account_id)
        if acc and acc.is_active:
            return acc
    # Fallback: first active account
    accounts = get_user_accounts(db, tg_user.user_id)
    return accounts[0] if accounts else None


# ─── Category helpers ──────────────────────────────────────────────────────

def get_user_categories(db: Session, user_id: str) -> List[Dict]:
    """Get categories as dicts (for voice/text parsing compatibility)."""
    cats = db.query(Category).filter(
        (Category.user_id == user_id) | (Category.user_id == None),
        Category.is_active == True,
    ).all()
    return [{"id": c.id, "name": c.name, "icon": c.icon} for c in cats]


def get_category_by_id(db: Session, category_id: str) -> Optional[Category]:
    return db.query(Category).filter(Category.id == category_id).first()


# ─── Transaction helpers ──────────────────────────────────────────────────

def get_recent_transactions(db: Session, user_id: str, limit: int = 5) -> List[Transaction]:
    return db.query(Transaction).filter(
        Transaction.user_id == user_id,
    ).order_by(Transaction.transaction_date.desc()).limit(limit).all()


def create_transaction(
    db: Session,
    user_id: str,
    account_id: str,
    category_id: Optional[str],
    transaction_type: str,
    amount: float,
    description: str,
    merchant: Optional[str] = None,
) -> Transaction:
    """Create a transaction, update account balance, and allocate jars if income."""
    txn = Transaction(
        id=str(uuid.uuid4()),
        user_id=user_id,
        account_id=account_id,
        category_id=category_id,
        transaction_type=TransactionType(transaction_type),
        amount=amount,
        description=description,
        merchant=merchant,
        transaction_date=datetime.now(timezone.utc),
    )
    db.add(txn)

    # Update account balance
    account = db.query(Account).filter(Account.id == account_id).with_for_update().first()
    if account:
        if transaction_type == "INCOME":
            account.balance += amount
        else:
            account.balance -= amount

    # Jar allocation for income
    if transaction_type == "INCOME":
        _allocate_jars(db, user_id, txn.id, amount)

    db.commit()
    db.refresh(txn)
    return txn


def _allocate_jars(db: Session, user_id: str, transaction_id: str, amount: float):
    """Allocate income to jars based on user config or defaults."""
    configs = db.query(JarConfig).filter(
        JarConfig.user_id == user_id,
        JarConfig.is_active == True,
    ).all()

    if configs:
        percentages = {c.jar_type: c.percentage for c in configs}
    else:
        percentages = {jt.value: pct for jt, pct in DEFAULT_JAR_PERCENTAGES.items()}

    for jar_type, pct in percentages.items():
        jar_amount = round(amount * pct / 100.0, 2)
        if jar_amount > 0:
            alloc = JarAllocation(
                id=str(uuid.uuid4()),
                user_id=user_id,
                transaction_id=transaction_id,
                jar_type=jar_type,
                amount=jar_amount,
            )
            db.add(alloc)


def get_account_balance_display(account: Account) -> str:
    """Format account balance for display."""
    symbol = {"USD": "$", "RUB": "₽", "EUR": "€", "UZS": "сум"}.get(account.currency, account.currency)
    return f"{symbol}{account.balance:,.2f}"
