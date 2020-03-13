import { Bot } from "./core/bot";
import { Server } from "./core/server";
import { Queue } from "./core/queue";
import { TrashService } from "./services/trash.service";
import { ChangeTitleService } from "./services/change-title.service";
import { Redis } from "./core/redis";
import { BibaService } from "./services/biba.service";
import { GlobalMessageHandler } from "./handlers/global.message.handler";
import { BibacoinService } from "./services/bibacoin.service";

if (process.env.CLOUD !== 'true') {
    require('dotenv').config();
}

// CORE
Redis.getInstance();
new Server();
new Queue('auto:rename');
new Queue('daily:checks');

// SERVICES
ChangeTitleService.getInstance();
BibaService.getInstance();
TrashService.getInstance();
BibacoinService.getInstance();
Bot.getInstance().applyListeners();
GlobalMessageHandler.getInstance()