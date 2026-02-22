from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from pydantic import BaseModel
from config.database import get_db
from src.models.user import User
from src.models.account import Account
from src.models.transaction import Transaction, TransactionType
from src.models.debt import Debt
from src.routes.auth import get_current_user_dependency

router = APIRouter()


class Insight(BaseModel):
    id: str
    type: str  # spending, saving, debt, balance, income, trend
    severity: str  # info, warning, success, alert
    title: str
    description: str
    icon: str
    value: Optional[float] = None
    change_pct: Optional[float] = None
    category: Optional[str] = None


class InsightsResponse(BaseModel):
    insights: List[Insight]
    generated_at: datetime


@router.get("", response_model=InsightsResponse)
async def get_insights(
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db),
):
    """Generate AI-powered financial insights based on user data."""
    now = datetime.utcnow()
    this_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    last_month_start = (this_month_start - timedelta(days=1)).replace(day=1)
    last_month_end = this_month_start - timedelta(seconds=1)

    # Fetch data
    accounts = db.query(Account).filter(
        Account.user_id == current_user.id, Account.is_active == True
    ).all()

    this_month_txns = db.query(Transaction).filter(
        Transaction.user_id == current_user.id,
        Transaction.transaction_date >= this_month_start,
    ).all()

    last_month_txns = db.query(Transaction).filter(
        Transaction.user_id == current_user.id,
        Transaction.transaction_date >= last_month_start,
        Transaction.transaction_date <= last_month_end,
    ).all()

    all_debts = db.query(Debt).filter(
        Debt.user_id == current_user.id, Debt.is_paid == False
    ).all()

    insights: List[Insight] = []
    idx = 0

    # ── 1. Monthly spending comparison ──────────────────────────
    this_expense = sum(t.amount for t in this_month_txns if t.transaction_type == TransactionType.EXPENSE)
    last_expense = sum(t.amount for t in last_month_txns if t.transaction_type == TransactionType.EXPENSE)

    if last_expense > 0:
        change = ((this_expense - last_expense) / last_expense) * 100
        if change > 15:
            insights.append(Insight(
                id=f"insight_{idx}", type="spending", severity="warning",
                title="Spending Up",
                description=f"You've spent {change:.0f}% more this month compared to last month. Consider reviewing your expenses.",
                icon="trending_up", value=this_expense, change_pct=round(change, 1),
            ))
            idx += 1
        elif change < -10:
            insights.append(Insight(
                id=f"insight_{idx}", type="spending", severity="success",
                title="Spending Down",
                description=f"Great job! Your spending is down {abs(change):.0f}% compared to last month.",
                icon="trending_down", value=this_expense, change_pct=round(change, 1),
            ))
            idx += 1

    # ── 2. Savings rate ─────────────────────────────────────────
    this_income = sum(t.amount for t in this_month_txns if t.transaction_type == TransactionType.INCOME)
    if this_income > 0:
        savings_rate = ((this_income - this_expense) / this_income) * 100
        if savings_rate >= 20:
            insights.append(Insight(
                id=f"insight_{idx}", type="saving", severity="success",
                title="Strong Savings",
                description=f"Your savings rate is {savings_rate:.0f}% this month. You're building wealth!",
                icon="savings", value=round(this_income - this_expense, 2), change_pct=round(savings_rate, 1),
            ))
            idx += 1
        elif savings_rate < 5 and this_income > 0:
            insights.append(Insight(
                id=f"insight_{idx}", type="saving", severity="alert",
                title="Low Savings",
                description=f"You're only saving {savings_rate:.0f}% of your income. Try to cut non-essential expenses.",
                icon="warning", value=round(this_income - this_expense, 2), change_pct=round(savings_rate, 1),
            ))
            idx += 1
        else:
            insights.append(Insight(
                id=f"insight_{idx}", type="saving", severity="info",
                title="Savings Rate",
                description=f"You're saving {savings_rate:.0f}% of your income this month. Aim for 20%+.",
                icon="account_balance_wallet", value=round(this_income - this_expense, 2), change_pct=round(savings_rate, 1),
            ))
            idx += 1

    # ── 3. Top spending category ────────────────────────────────
    expense_by_cat: Dict[str, float] = {}
    for t in this_month_txns:
        if t.transaction_type == TransactionType.EXPENSE and t.category:
            cat_name = t.category.name if t.category else "Other"
            expense_by_cat[cat_name] = expense_by_cat.get(cat_name, 0) + t.amount

    if expense_by_cat:
        top_cat = max(expense_by_cat, key=expense_by_cat.get)  # type: ignore
        top_amount = expense_by_cat[top_cat]
        pct_of_total = (top_amount / this_expense * 100) if this_expense > 0 else 0
        if pct_of_total > 40:
            insights.append(Insight(
                id=f"insight_{idx}", type="spending", severity="warning",
                title=f"Heavy on {top_cat}",
                description=f"{top_cat} accounts for {pct_of_total:.0f}% of your spending (${top_amount:,.2f}). Look for ways to reduce it.",
                icon="pie_chart", value=top_amount, change_pct=round(pct_of_total, 1),
                category=top_cat,
            ))
            idx += 1
        elif len(expense_by_cat) >= 2:
            insights.append(Insight(
                id=f"insight_{idx}", type="spending", severity="info",
                title=f"Top Category: {top_cat}",
                description=f"Your biggest expense category is {top_cat} at ${top_amount:,.2f} ({pct_of_total:.0f}% of total).",
                icon="category", value=top_amount, change_pct=round(pct_of_total, 1),
                category=top_cat,
            ))
            idx += 1

    # ── 4. Debt reminders ───────────────────────────────────────
    for debt in all_debts:
        if debt.due_date:
            days_until = (debt.due_date.replace(tzinfo=None) - now).days
            if days_until < 0:
                insights.append(Insight(
                    id=f"insight_{idx}", type="debt", severity="alert",
                    title="Overdue Payment",
                    description=f"Payment to {debt.person_name} (${debt.amount:,.2f}) is {abs(days_until)} days overdue!",
                    icon="error", value=debt.amount,
                ))
                idx += 1
            elif days_until <= 7:
                insights.append(Insight(
                    id=f"insight_{idx}", type="debt", severity="warning",
                    title="Payment Due Soon",
                    description=f"Payment to {debt.person_name} (${debt.amount:,.2f}) is due in {days_until} day{'s' if days_until != 1 else ''}.",
                    icon="schedule", value=debt.amount,
                ))
                idx += 1

    # ── 5. Low balance warning ──────────────────────────────────
    for acc in accounts:
        if acc.balance < 50 and acc.balance >= 0 and not acc.exclude_from_total:
            insights.append(Insight(
                id=f"insight_{idx}", type="balance", severity="warning",
                title=f"Low Balance: {acc.name}",
                description=f"{acc.name} has only ${acc.balance:,.2f} remaining. Consider topping it up.",
                icon="account_balance", value=acc.balance,
            ))
            idx += 1

    # ── 6. Income trend ─────────────────────────────────────────
    last_income = sum(t.amount for t in last_month_txns if t.transaction_type == TransactionType.INCOME)
    if last_income > 0 and this_income > 0:
        income_change = ((this_income - last_income) / last_income) * 100
        if income_change > 10:
            insights.append(Insight(
                id=f"insight_{idx}", type="income", severity="success",
                title="Income Growing",
                description=f"Your income is up {income_change:.0f}% compared to last month. Keep it up!",
                icon="moving", value=this_income, change_pct=round(income_change, 1),
            ))
            idx += 1
        elif income_change < -15:
            insights.append(Insight(
                id=f"insight_{idx}", type="income", severity="warning",
                title="Income Decreased",
                description=f"Your income dropped {abs(income_change):.0f}% from last month. Plan your budget accordingly.",
                icon="trending_down", value=this_income, change_pct=round(income_change, 1),
            ))
            idx += 1

    # ── 7. Transaction frequency ────────────────────────────────
    days_passed = max((now - this_month_start).days, 1)
    daily_avg = len(this_month_txns) / days_passed
    if daily_avg > 3:
        insights.append(Insight(
            id=f"insight_{idx}", type="trend", severity="info",
            title="High Activity",
            description=f"You're averaging {daily_avg:.1f} transactions per day. Consider batching purchases.",
            icon="speed",
        ))
        idx += 1

    # ── 8. No income yet this month ─────────────────────────────
    if this_income == 0 and days_passed > 10:
        insights.append(Insight(
            id=f"insight_{idx}", type="income", severity="alert",
            title="No Income Recorded",
            description="No income has been recorded this month yet. Make sure to log your earnings.",
            icon="info",
        ))
        idx += 1

    # ── 9. Good balance overview ────────────────────────────────
    total_balance = sum(a.balance for a in accounts if not a.exclude_from_total)
    if total_balance > 0 and len(accounts) > 0:
        insights.append(Insight(
            id=f"insight_{idx}", type="balance", severity="info",
            title="Portfolio Overview",
            description=f"Total across {len(accounts)} account{'s' if len(accounts) > 1 else ''}: ${total_balance:,.2f}.",
            icon="wallet", value=total_balance,
        ))
        idx += 1

    # Sort: alerts first, then warnings, then success, then info
    severity_order = {"alert": 0, "warning": 1, "success": 2, "info": 3}
    insights.sort(key=lambda i: severity_order.get(i.severity, 4))

    return InsightsResponse(insights=insights, generated_at=now)
