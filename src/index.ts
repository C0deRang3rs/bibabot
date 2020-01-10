import { Bot } from "./core/bot";
import { Server } from "./core/server";

new Bot();
new Server();
console.log(process.env.REDIS);
console.log(process.env.REDIS_URL);