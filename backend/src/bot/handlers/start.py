"""/start — account linking via email + password."""

from telegram import Update
from telegram.ext import (
    ContextTypes,
    ConversationHandler,
    CommandHandler,
    MessageHandler,
    filters,
)

from config.security import verify_password
from src.bot.strings import get_text
from src.bot.services.transaction_service import (
    get_db,
    get_telegram_user,
    create_telegram_user,
    get_user_by_email,
    get_user_accounts,
    get_default_account,
)

# Conversation states
EMAIL, PASSWORD = range(2)


async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Handle /start — check if already linked, otherwise ask for email."""
    chat_id = update.effective_chat.id
    db = get_db()
    try:
        tg_user = get_telegram_user(db, chat_id)
        if tg_user and tg_user.is_active:
            lang = tg_user.language
            await update.message.reply_text(
                get_text(lang, "already_linked"),
                parse_mode="Markdown",
            )
            return ConversationHandler.END

        # Detect language from Telegram user
        lang_code = (update.effective_user.language_code or "en")[:2]
        lang = "ru" if lang_code == "ru" else "en"
        context.user_data["link_lang"] = lang

        await update.message.reply_text(
            get_text(lang, "welcome"),
            parse_mode="Markdown",
        )
        return EMAIL
    finally:
        db.close()


async def receive_email(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Store email and ask for password."""
    lang = context.user_data.get("link_lang", "en")
    email = update.message.text.strip().lower()
    context.user_data["link_email"] = email

    await update.message.reply_text(
        get_text(lang, "ask_password"),
        parse_mode="Markdown",
    )
    return PASSWORD


async def receive_password(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Verify credentials, create TelegramUser, delete password message."""
    lang = context.user_data.get("link_lang", "en")
    email = context.user_data.get("link_email", "")
    password = update.message.text

    # Try to delete the password message for security
    try:
        await update.message.delete()
    except Exception:
        pass

    db = get_db()
    try:
        user = get_user_by_email(db, email)
        if not user or not verify_password(password, user.password_hash):
            await update.effective_chat.send_message(
                get_text(lang, "link_fail"),
                parse_mode="Markdown",
            )
            return ConversationHandler.END

        # Get or pick default account
        accounts = get_user_accounts(db, user.id)
        default_account_id = accounts[0].id if accounts else None
        default_account_name = accounts[0].name if accounts else "None"

        # Check if TelegramUser already exists (inactive)
        existing = get_telegram_user(db, update.effective_chat.id)
        if existing:
            existing.user_id = user.id
            existing.default_account_id = default_account_id
            existing.language = lang
            existing.is_active = True
            db.commit()
        else:
            create_telegram_user(
                db,
                chat_id=update.effective_chat.id,
                user_id=user.id,
                language=lang,
                default_account_id=default_account_id,
            )

        await update.effective_chat.send_message(
            get_text(lang, "link_success", account=default_account_name),
            parse_mode="Markdown",
        )
    finally:
        db.close()

    context.user_data.pop("link_email", None)
    context.user_data.pop("link_lang", None)
    return ConversationHandler.END


async def cancel(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Cancel the linking conversation."""
    await update.message.reply_text("Cancelled.")
    return ConversationHandler.END


def get_start_handler() -> ConversationHandler:
    """Build the /start ConversationHandler."""
    return ConversationHandler(
        entry_points=[CommandHandler("start", start_command)],
        states={
            EMAIL: [MessageHandler(filters.TEXT & ~filters.COMMAND, receive_email)],
            PASSWORD: [MessageHandler(filters.TEXT & ~filters.COMMAND, receive_password)],
        },
        fallbacks=[CommandHandler("cancel", cancel)],
    )
