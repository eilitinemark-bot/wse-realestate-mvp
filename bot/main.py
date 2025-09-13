import os
import asyncio
from aiogram import Bot, Dispatcher, F
from aiogram.types import Message, InlineKeyboardMarkup, InlineKeyboardButton

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
WEBAPP_URL = os.getenv("WEBAPP_URL", "http://localhost:8080")

bot = Bot(BOT_TOKEN)
dp = Dispatcher()

@dp.message(F.text == "/start")
async def start(msg: Message):
    kb = InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text="Открыть каталог", url=WEBAPP_URL)
    ]])
    await msg.answer("White Safe Estate — каталог недвижимости Еревана.
Для локального теста откроется в браузере.", reply_markup=kb)

async def main():
    if not BOT_TOKEN:
        print("WARNING: TELEGRAM_BOT_TOKEN is empty — бот не запущен.")
        return
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
