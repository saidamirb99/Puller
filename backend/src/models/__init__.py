from config.database import Base
from src.models.user import User
from src.models.account import Account, AccountType
from src.models.category import Category
from src.models.transaction import Transaction, TransactionType
from src.models.debt import Debt
from src.models.debt_payment import DebtPayment
from src.models.jar import JarConfig, JarAllocation, JarType
from src.models.investment import InvestmentHolding, InvestmentTransaction, AssetType, InvestmentTxnType
from src.models.watchlist import WatchlistItem
from src.bot.models import TelegramUser

# Import all models here for Alembic migrations
__all__ = [
    "Base", "User", "Account", "AccountType", "Category", "Transaction", "TransactionType",
    "Debt", "DebtPayment",
    "JarConfig", "JarAllocation", "JarType",
    "InvestmentHolding", "InvestmentTransaction", "AssetType", "InvestmentTxnType",
    "WatchlistItem",
    "TelegramUser",
]
