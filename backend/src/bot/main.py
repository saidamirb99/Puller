"""Telegram bot entry point — polling mode."""

import sys
import os

# Ensure the backend directory is on the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from telegram.ext import ApplicationBuilder, CommandHandler, MessageHandler, filters

from config.settings import settings
from config.database import init_db

from src.bot.handlers.start import get_start_handler
from src.bot.handlers.commands import help_command, balance_command, recent_command, accounts_command
from src.bot.handlers.text_input import handle_text
from src.bot.handlers.voice_input import handle_voice
from src.bot.handlers.photo_input import handle_photo
from src.bot.handlers.confirm import get_confirm_handler


def main():
    token = settings.TELEGRAM_BOT_TOKEN
    if not token:
        print("Error: TELEGRAM_BOT_TOKEN not set in .env")
        sys.exit(1)

    # Ensure DB tables exist (including telegram_users)
    # Import model so Base.metadata knows about it
    from src.bot.models import TelegramUser  # noqa: F401
    init_db()

    app = ApplicationBuilder().token(token).build()

    # /start conversation (must come before generic text handler)
    app.add_handler(get_start_handler())

    # Commands
    app.add_handler(CommandHandler("help", help_command))
    app.add_handler(CommandHandler("balance", balance_command))
    app.add_handler(CommandHandler("recent", recent_command))
    app.add_handler(CommandHandler("accounts", accounts_command))

    # Inline keyboard callbacks (tx_confirm, tx_cancel, tx_type_*, tx_cat_*, tx_acc_*)
    app.add_handler(get_confirm_handler())

    # Voice messages
    app.add_handler(MessageHandler(filters.VOICE, handle_voice))

    # Photos (receipts)
    app.add_handler(MessageHandler(filters.PHOTO, handle_photo))

    # Plain text (must be last — catches everything else)
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text))

    print("🤖 Puller Telegram Bot started (polling)...")
    app.run_polling()


if __name__ == "__main__":
    main()
