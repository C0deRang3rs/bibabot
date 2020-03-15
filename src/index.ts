/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable global-require */
import { config } from 'dotenv';
import Server from './core/server';
import Queue from './core/queue';
import TrashService from './services/trash.service';
import ChangeTitleService from './services/change-title.service';
import BibaService from './services/biba.service';
import GlobalMessageHandler from './handlers/global.message.handler';
import BibacoinService from './services/bibacoin.service';
import Redis from './core/redis';
import Bot from './core/bot';

if (process.env.CLOUD !== 'true') config();

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
GlobalMessageHandler.getInstance();
