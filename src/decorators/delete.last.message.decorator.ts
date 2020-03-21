import { ContextMessageUpdate } from 'telegraf';
import { Message } from 'telegraf/typings/telegram-types';
import Bot from '../core/bot';
import Redis from '../core/redis';

const DeleteLastMessage = (prefix: string) => (_target: object, _propKey: string, desc: PropertyDescriptor): void => {
  const method: Function = desc.value;

  // eslint-disable-next-line no-param-reassign
  desc.value = async function wrapped(...args: ContextMessageUpdate[]): Promise<void> {
    const message: Message = await method.apply(this, args);
    const lastMessage = await Redis.getInstance().client.getAsync(`last:message:${prefix}:${message.chat!.id}`);

    if (lastMessage) {
      try {
        await Bot.getInstance().app.telegram.deleteMessage(message.chat!.id, parseInt(lastMessage, 10));
      } catch (err) {
        Bot.handleError(err);
      }
    }

    await Redis.getInstance().client.setAsync(`last:message:${prefix}:${message.chat!.id}`, message.message_id.toString());
  };
};

export default DeleteLastMessage;
