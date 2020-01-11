import { Bot } from "./core/bot";
import { Server } from "./core/server";

if (process.env.CLOUD !== 'true') {
    require('dotenv').config();
}

new Bot();
new Server();