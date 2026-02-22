from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from config.database import get_db
from src.models.user import User
from src.models.account import Account, AccountType
from src.models.category import Category, DEFAULT_CATEGORIES
from src.models.transaction import Transaction, TransactionType
from src.schemas.account import AccountCreate, AccountUpdate, AccountResponse, AccountSummary
from src.routes.auth import get_current_user_dependency

router = APIRouter()


@router.post("", response_model=AccountResponse, status_code=status.HTTP_201_CREATED)
async def create_account(
    account_data: AccountCreate,
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db)
):
    """Create a new account"""
    # Create new account
    new_account = Account(
        user_id=current_user.id,
        name=account_data.name,
        account_type=account_data.account_type,
        currency=account_data.currency,
        balance=account_data.initial_balance,
        initial_balance=account_data.initial_balance,
        credit_limit=account_data.credit_limit,
        institution=account_data.institution,
        account_number_last4=account_data.account_number_last4,
        color=account_data.color,
        icon=account_data.icon,
        exclude_from_total=account_data.exclude_from_total,
    )

    db.add(new_account)
    db.commit()
    db.refresh(new_account)

    # If initial balance > 0, create an INCOME transaction categorized as "Initial Balance"
    if account_data.initial_balance and account_data.initial_balance > 0:
        # Find or create the "Initial Balance" system category
        initial_balance_cat = db.query(Category).filter(
            Category.name == "Initial Balance",
            Category.is_system == True,
            Category.user_id == None,
        ).first()

        if not initial_balance_cat:
            # Seed all system categories if missing
            existing_system = db.query(Category).filter(
                Category.is_system == True,
                Category.user_id == None,
            ).all()
            existing_names = {c.name for c in existing_system}
            for cat_data in DEFAULT_CATEGORIES:
                if cat_data["name"] not in existing_names:
                    db.add(Category(
                        user_id=None,
                        name=cat_data["name"],
                        icon=cat_data["icon"],
                        color=cat_data["color"],
                        is_system=True,
                    ))
            db.commit()
            initial_balance_cat = db.query(Category).filter(
                Category.name == "Initial Balance",
                Category.is_system == True,
                Category.user_id == None,
            ).first()

        initial_txn = Transaction(
            user_id=current_user.id,
            account_id=new_account.id,
            category_id=initial_balance_cat.id if initial_balance_cat else None,
            transaction_type=TransactionType.INCOME,
            amount=account_data.initial_balance,
            description="Initial Balance",
            notes=None,
            transaction_date=datetime.now(timezone.utc),
            merchant=None,
            tags=None,
        )
        db.add(initial_txn)
        db.commit()

    return new_account


@router.get("", response_model=List[AccountResponse])
async def get_accounts(
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db),
    include_inactive: bool = False
):
    """Get all accounts for the current user"""
    query = db.query(Account).filter(Account.user_id == current_user.id)

    if not include_inactive:
        query = query.filter(Account.is_active == True)

    accounts = query.order_by(Account.created_at.desc()).all()
    return accounts


@router.get("/summary", response_model=AccountSummary)
async def get_account_summary(
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db)
):
    """Get summary statistics for user's accounts"""
    accounts = db.query(Account).filter(
        Account.user_id == current_user.id,
        Account.is_active == True
    ).all()

    total_balance = sum(
        acc.balance for acc in accounts
        if not acc.exclude_from_total
    )

    # Balance by currency
    balance_by_currency = {}
    for acc in accounts:
        if not acc.exclude_from_total:
            if acc.currency not in balance_by_currency:
                balance_by_currency[acc.currency] = 0
            balance_by_currency[acc.currency] += acc.balance

    # Accounts by type
    accounts_by_type = {}
    for acc in accounts:
        type_name = acc.account_type.value
        if type_name not in accounts_by_type:
            accounts_by_type[type_name] = 0
        accounts_by_type[type_name] += 1

    return AccountSummary(
        total_accounts=len(accounts),
        total_balance=total_balance,
        total_balance_by_currency=balance_by_currency,
        accounts_by_type=accounts_by_type
    )


@router.get("/{account_id}", response_model=AccountResponse)
async def get_account(
    account_id: str,
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db)
):
    """Get a specific account"""
    account = db.query(Account).filter(
        Account.id == account_id,
        Account.user_id == current_user.id
    ).first()

    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )

    return account


@router.put("/{account_id}", response_model=AccountResponse)
async def update_account(
    account_id: str,
    account_data: AccountUpdate,
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db)
):
    """Update an account"""
    account = db.query(Account).filter(
        Account.id == account_id,
        Account.user_id == current_user.id
    ).first()

    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )

    # Update only provided fields
    update_data = account_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(account, field, value)

    db.commit()
    db.refresh(account)

    return account


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(
    account_id: str,
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db)
):
    """Delete an account (soft delete by setting is_active to False)"""
    account = db.query(Account).filter(
        Account.id == account_id,
        Account.user_id == current_user.id
    ).first()

    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )

    # Soft delete
    account.is_active = False
    db.commit()

    return None
