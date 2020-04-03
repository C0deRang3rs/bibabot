import { ContextMessageUpdate } from 'telegraf';
import { Message } from 'telegraf/typings/telegram-types';
import DeleteResponseMessage from '../decorators/delete.response.message.decorator';

export default class GlobalHelper {
  @DeleteResponseMessage(5000)
  public static async sendError(ctx: ContextMessageUpdate, message: string): Promise<Message> {
    return ctx.reply(message);
  }
}
