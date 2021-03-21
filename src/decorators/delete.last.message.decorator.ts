import { Context } from 'telegraf/typings/context';
import { Message } from 'telegraf/typings/core/types/typegram';
import Bot from '../core/bot';
import LastMessageRepository from '../repositories/last.message.repo';

const DeleteLastMessage = (prefix: string) => (_target: object, _propKey: string, desc: PropertyDescriptor): void => {
  const lastMessageRepo = new LastMessageRepository();
  const method: Function = desc.value;

  // eslint-disable-next-line no-param-reassign
  desc.value = async function wrapped(...args: [Context]): Promise<object> {
    const message: Message = await method.apply(this, args);
    const chatId = message.chat.id;
    const lastMessage = await lastMessageRepo.getLastMessage(prefix, chatId);

    if (lastMessage) {
      try {
        await Bot.getInstance().app.telegram.deleteMessage(chatId, lastMessage);
      } catch (err) {
        Bot.handleError(`Error: ${err.description} in DeleteLastMessage decorator`);
      }
    }

    await lastMessageRepo.setLastMessage(prefix, chatId, message.message_id);

    return message;
  };
};

export default DeleteLastMessage;
