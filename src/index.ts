import { Bot } from "./core/bot";
import { Server } from "./core/server";
import { Queue } from "./core/queue";

if (process.env.CLOUD !== 'true') {
    require('dotenv').config();
}

Bot.getInstance();
new Server();
new Queue();