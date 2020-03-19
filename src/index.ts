import { config } from 'dotenv';
import Server from './core/server';
import Queue from './core/queue';
import TrashService from './services/trash.service';
import ChangeTitleService from './services/change-title.service';
import BibaService from './services/biba.service';
import BibacoinService from './services/bibacoin.service';
import Redis from './core/redis';
import Bot from './core/bot';
import ShopService from './services/shop.service';
import GlobalService from './services/global.service';

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
ShopService.getInstance();
GlobalService.getInstance();
Bot.getInstance().applyListeners();
GlobalService.getInstance().initMessageHandler();
