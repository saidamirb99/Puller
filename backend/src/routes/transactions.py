from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional
from datetime import datetime, timedelta
from config.database import get_db
from src.models.user import User
from src.models.account import Account
from src.models.transaction import Transaction, TransactionType
from src.models.category import Category
from src.schemas.transaction import (
    TransactionCreate,
    TransactionUpdate,
    TransactionResponse,
    TransactionStats,
    TransferCreate,
    TransferResponse,
)
from src.models.jar import JarConfig, JarAllocation, DEFAULT_JAR_PERCENTAGES, JarType
from src.routes.auth import get_current_user_dependency


def _allocate_to_jars(db: Session, user_id: str, transaction_id: str, amount: float):
    """Create jar allocations for an income transaction."""
    configs = db.query(JarConfig).filter(JarConfig.user_id == user_id).all()
    if not configs:
        for jar_type, pct in DEFAULT_JAR_PERCENTAGES.items():
            configs.append(JarConfig(user_id=user_id, jar_type=jar_type.value, percentage=pct))
            db.add(configs[-1])
        db.flush()
    for config in configs:
        if config.is_active and config.percentage > 0:
            db.add(JarAllocation(
                user_id=user_id,
                transaction_id=transaction_id,
                jar_type=config.jar_type,
                amount=round(amount * config.percentage / 100.0, 2),
            ))

router = APIRouter()


@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_transaction(
    transaction_data: TransactionCreate,
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db)
):
    """
    Create a new transaction and automatically update account balance.

    CRITICAL: This is the auto-balance update logic!
    - EXPENSE: Decreases account balance
    - INCOME: Increases account balance
    """
    # Verify account belongs to user
    account = db.query(Account).filter(
        Account.id == transaction_data.account_id,
        Account.user_id == current_user.id,
        Account.is_active == True
    ).first()

    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found or inactive"
        )

    # Verify category if provided
    if transaction_data.category_id:
        category = db.query(Category).filter(
            Category.id == transaction_data.category_id
        ).first()
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found"
            )

    # Create transaction
    new_transaction = Transaction(
        user_id=current_user.id,
        account_id=transaction_data.account_id,
        category_id=transaction_data.category_id,
        transaction_type=transaction_data.transaction_type,
        amount=transaction_data.amount,
        description=transaction_data.description,
        notes=transaction_data.notes,
        transaction_date=transaction_data.transaction_date,
        merchant=transaction_data.merchant,
        tags=transaction_data.tags,
    )

    # AUTO-BALANCE UPDATE: Update account balance based on transaction type
    if transaction_data.transaction_type == TransactionType.EXPENSE:
        account.balance -= transaction_data.amount
    elif transaction_data.transaction_type == TransactionType.INCOME:
        account.balance += transaction_data.amount

    db.add(new_transaction)
    db.commit()
    db.refresh(new_transaction)

    # Auto-allocate income to 6 jars
    if transaction_data.transaction_type == TransactionType.INCOME:
        _allocate_to_jars(db, current_user.id, new_transaction.id, transaction_data.amount)
        db.commit()

    return new_transaction


@router.post("/transfer", response_model=TransferResponse, status_code=status.HTTP_201_CREATED)
async def create_transfer(
    transfer_data: TransferCreate,
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db)
):
    """
    Transfer money between two accounts.
    Creates an EXPENSE on the source account and an INCOME on the destination account.
    If currencies differ and no exchange_rate is provided, defaults to 1.0.
    """
    if transfer_data.from_account_id == transfer_data.to_account_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Source and destination accounts must be different"
        )

    from_account = db.query(Account).filter(
        Account.id == transfer_data.from_account_id,
        Account.user_id == current_user.id,
        Account.is_active == True
    ).first()
    if not from_account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source account not found or inactive")

    to_account = db.query(Account).filter(
        Account.id == transfer_data.to_account_id,
        Account.user_id == current_user.id,
        Account.is_active == True
    ).first()
    if not to_account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Destination account not found or inactive")

    exchange_rate = transfer_data.exchange_rate
    same_currency = from_account.currency == to_account.currency

    if same_currency:
        exchange_rate = 1.0
    elif exchange_rate is None:
        exchange_rate = 1.0

    to_amount = round(transfer_data.amount * exchange_rate, 2)

    # Create EXPENSE transaction on source account
    expense_tx = Transaction(
        user_id=current_user.id,
        account_id=from_account.id,
        transaction_type=TransactionType.EXPENSE,
        amount=transfer_data.amount,
        description=transfer_data.description,
        notes=transfer_data.notes,
        transaction_date=transfer_data.transaction_date,
        tags="transfer",
    )
    from_account.balance -= transfer_data.amount

    # Create INCOME transaction on destination account
    income_tx = Transaction(
        user_id=current_user.id,
        account_id=to_account.id,
        transaction_type=TransactionType.INCOME,
        amount=to_amount,
        description=transfer_data.description,
        notes=transfer_data.notes,
        transaction_date=transfer_data.transaction_date,
        tags="transfer",
    )
    to_account.balance += to_amount

    db.add(expense_tx)
    db.add(income_tx)
    db.commit()
    db.refresh(expense_tx)
    db.refresh(income_tx)

    # NOTE: No jar allocations for transfer income

    return TransferResponse(
        expense_transaction=expense_tx,
        income_transaction=income_tx,
        exchange_rate=exchange_rate if not same_currency else None,
        from_currency=from_account.currency,
        to_currency=to_account.currency,
    )


@router.get("", response_model=List[TransactionResponse])
async def get_transactions(
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db),
    account_id: Optional[str] = None,
    transaction_type: Optional[TransactionType] = None,
    category_id: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    limit: int = Query(default=100, le=1000),
    offset: int = 0
):
    """Get transactions with optional filters"""
    query = db.query(Transaction).filter(Transaction.user_id == current_user.id)

    if account_id:
        query = query.filter(Transaction.account_id == account_id)

    if transaction_type:
        query = query.filter(Transaction.transaction_type == transaction_type)

    if category_id:
        query = query.filter(Transaction.category_id == category_id)

    if start_date:
        query = query.filter(Transaction.transaction_date >= start_date)

    if end_date:
        # If end_date has no time component (midnight), extend to end of day
        if end_date.hour == 0 and end_date.minute == 0 and end_date.second == 0:
            end_date = end_date.replace(hour=23, minute=59, second=59, microsecond=999999)
        query = query.filter(Transaction.transaction_date <= end_date)

    transactions = query.order_by(desc(Transaction.transaction_date)).offset(offset).limit(limit).all()
    return transactions


@router.get("/stats", response_model=TransactionStats)
async def get_transaction_stats(
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db),
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
):
    """Get transaction statistics for a date range"""
    query = db.query(Transaction).filter(Transaction.user_id == current_user.id)

    if start_date:
        query = query.filter(Transaction.transaction_date >= start_date)

    if end_date:
        # If end_date has no time component (midnight), extend to end of day
        if end_date.hour == 0 and end_date.minute == 0 and end_date.second == 0:
            end_date = end_date.replace(hour=23, minute=59, second=59, microsecond=999999)
        query = query.filter(Transaction.transaction_date <= end_date)

    transactions = query.all()

    total_income = sum(t.amount for t in transactions if t.transaction_type == TransactionType.INCOME)
    total_expense = sum(t.amount for t in transactions if t.transaction_type == TransactionType.EXPENSE)
    net_income = total_income - total_expense

    # Group by category
    by_category = {}
    for t in transactions:
        if t.category_id:
            category = db.query(Category).filter(Category.id == t.category_id).first()
            category_name = category.name if category else "Uncategorized"
        else:
            category_name = "Uncategorized"

        if category_name not in by_category:
            by_category[category_name] = 0
        by_category[category_name] += t.amount

    return TransactionStats(
        total_income=total_income,
        total_expense=total_expense,
        net_income=net_income,
        transaction_count=len(transactions),
        by_category=by_category
    )


@router.get("/{transaction_id}", response_model=TransactionResponse)
async def get_transaction(
    transaction_id: str,
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db)
):
    """Get a specific transaction"""
    transaction = db.query(Transaction).filter(
        Transaction.id == transaction_id,
        Transaction.user_id == current_user.id
    ).first()

    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )

    return transaction


@router.put("/{transaction_id}", response_model=TransactionResponse)
async def update_transaction(
    transaction_id: str,
    transaction_data: TransactionUpdate,
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db)
):
    """Update a transaction. If amount changes, recalculates account balance."""
    transaction = db.query(Transaction).filter(
        Transaction.id == transaction_id,
        Transaction.user_id == current_user.id
    ).first()

    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )

    update_data = transaction_data.model_dump(exclude_unset=True)

    # Handle amount change: recalculate account balance
    new_amount = update_data.get('amount')
    if new_amount is not None and new_amount != transaction.amount:
        account = db.query(Account).filter(Account.id == transaction.account_id).first()
        if account:
            old_amount = transaction.amount
            diff = new_amount - old_amount
            if transaction.transaction_type == TransactionType.EXPENSE:
                account.balance -= diff  # More expense = less balance
            else:
                account.balance += diff  # More income = more balance

    # Recalculate jar allocations if income amount changed
    recalc_jars = (
        transaction.transaction_type == TransactionType.INCOME
        and new_amount is not None
        and new_amount != transaction.amount
    )

    for field, value in update_data.items():
        setattr(transaction, field, value)

    if recalc_jars:
        db.query(JarAllocation).filter(JarAllocation.transaction_id == transaction.id).delete()
        _allocate_to_jars(db, current_user.id, transaction.id, new_amount)

    db.commit()
    db.refresh(transaction)

    return transaction


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transaction(
    transaction_id: str,
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db)
):
    """
    Delete a transaction and reverse the balance update.

    CRITICAL: This reverses the auto-balance update!
    - If it was EXPENSE: Add back to account balance
    - If it was INCOME: Subtract from account balance
    """
    transaction = db.query(Transaction).filter(
        Transaction.id == transaction_id,
        Transaction.user_id == current_user.id
    ).first()

    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )

    # Get the account
    account = db.query(Account).filter(Account.id == transaction.account_id).first()

    if account:
        # REVERSE the balance update
        if transaction.transaction_type == TransactionType.EXPENSE:
            account.balance += transaction.amount  # Add back what was subtracted
        elif transaction.transaction_type == TransactionType.INCOME:
            account.balance -= transaction.amount  # Subtract what was added

    db.delete(transaction)
    db.commit()

    return None
