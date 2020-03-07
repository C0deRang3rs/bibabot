import { Bot } from "./core/bot";
import { Server } from "./core/server";
import { Queue } from "./core/queue";
import { TrashService } from "./services/trash.service";
import { ChangeTitleService } from "./services/change-title.service";
import { Redis } from "./core/redis";

if (process.env.CLOUD !== 'true') {
    require('dotenv').config();
}

// CORE
Redis.getInstance();
new Server();
new Queue();

// SERVICES
ChangeTitleService.getInstance();
TrashService.getInstance();
Bot.getInstance().applyListeners();