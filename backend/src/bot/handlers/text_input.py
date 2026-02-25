"""Handle plain text messages — parse as transactions."""

from telegram import Update
from telegram.ext import ContextTypes

from src.bot.strings import get_text
from src.bot.services.transaction_service import (
    get_db,
    get_telegram_user,
    get_user_categories,
)
from src.bot.services.text_parse_service import parse_text_transaction
from src.bot.handlers.confirm import send_confirmation


async def handle_text(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Parse text message as a transaction and show confirmation."""
    chat_id = update.effective_chat.id

    # Handle amount editing flow
    if context.user_data.get("awaiting_amount_edit"):
        context.user_data["awaiting_amount_edit"] = False
        pending = context.user_data.get("pending_tx")
        if pending:
            db = get_db()
            try:
                tg_user = get_telegram_user(db, chat_id)
                lang = tg_user.language if tg_user else "en"
            finally:
                db.close()

            try:
                new_amount = float(update.message.text.strip().replace(",", "."))
                pending["amount"] = new_amount

                from src.schemas.voice import VoiceParseResponse
                parsed = VoiceParseResponse(
                    transcript="",
                    amount=pending.get("amount"),
                    transaction_type=pending.get("transaction_type"),
                    category_name=pending.get("category_name"),
                    category_id=pending.get("category_id"),
                    merchant=pending.get("merchant"),
                    description=pending.get("description"),
                )
                await send_confirmation(update, context, parsed, chat_id, lang)
                return
            except ValueError:
                await update.message.reply_text(get_text(lang, "invalid_amount"))
                return
        return

    db = get_db()
    try:
        tg_user = get_telegram_user(db, chat_id)
        if not tg_user or not tg_user.is_active:
            lang = "en"
            if update.effective_user.language_code:
                lang = "ru" if update.effective_user.language_code.startswith("ru") else "en"
            await update.message.reply_text(
                get_text(lang, "not_linked"),
                parse_mode="Markdown",
            )
            return

        lang = tg_user.language
        categories = get_user_categories(db, tg_user.user_id)
    finally:
        db.close()

    text = update.message.text.strip()

    try:
        parsed = await parse_text_transaction(text, categories)
    except Exception as e:
        print(f"Text parse error: {e}")
        await update.message.reply_text(
            get_text(lang, "parse_error"),
            parse_mode="Markdown",
        )
        return

    if not parsed.amount:
        await update.message.reply_text(
            get_text(lang, "parse_error"),
            parse_mode="Markdown",
        )
        return

    await send_confirmation(update, context, parsed, chat_id, lang)
