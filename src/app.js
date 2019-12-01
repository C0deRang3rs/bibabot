const Telegraf = require('telegraf');
const generateName = require('./components/generateName');
const express = require('express');

const bot = new Telegraf(process.env.BOT_TOKEN);
const rest = express();

rest.use(express.json());
rest.use(express.urlencoded({extended: false}));

let intervals = {},
    chats = {};

async function changeTitle(ctx) {
    try {
        const newName = await generateName();
        console.log(`[${ctx.chat.id}] New name: ${newName}`);
        await bot.telegram.setChatTitle(ctx.chat.id, newName);

        if (!chats[ctx.chat.id.toString()]) chats[ctx.chat.id] = ctx.chat;
    } catch (e) {
        await bot.telegram.sendMessage('-395013027', e.message)
    }
}

bot.command('start', async (ctx) => {
    if (intervals[ctx.chat.id] !== undefined) {
        await ctx.reply('Уже запущен.');
        return;
    }

    intervals[ctx.chat.id] = setInterval(async () => await changeTitle(ctx), 12 * 60 * 60 * 1000);

    await ctx.reply('Ща как буду раз в 12 часов имена менять');
    await changeTitle(ctx);
    console.log(`[${ctx.chat.id}] Started`);
});

bot.command('stop', async (ctx) => {
    clearInterval(intervals[ctx.chat.id]);
    console.log(`[${ctx.chat.id}] Stopped`);
    await ctx.reply('Всё, больше не буду');
});

bot.command('rename', async (ctx) => {
    await changeTitle(ctx);
    console.log(`[${ctx.chat.id}] Renamed`);
});

rest.get('/chats', (req, res) => {
    res.send(chats);
});

bot.launch().then(() => console.log('Bot is up'));
rest.listen(process.env.PORT || 3000);
