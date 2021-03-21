import { Context } from 'telegraf/typings/context';
import { Message } from 'telegraf/typings/core/types/typegram';
import DeleteResponseMessage from '../decorators/delete.response.message.decorator';

export default class GlobalHelper {
  @DeleteResponseMessage(5000)
  public static async sendError(ctx: Context, message: string): Promise<Message> {
    return ctx.reply(message);
  }
}
