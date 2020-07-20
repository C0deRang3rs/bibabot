import { ContextMessageUpdate } from 'telegraf';
import { Message } from 'telegraf/typings/telegram-types';
import Bot from '../core/bot';
import LastMessageRepository from '../repositories/last.message.repo';

const lastMessageRepo = new LastMessageRepository();

const DeleteLastMessage = (prefix: string) => (_target: object, _propKey: string, desc: PropertyDescriptor): void => {
  const method: Function = desc.value;

  // eslint-disable-next-line no-param-reassign
  desc.value = async function wrapped(...args: ContextMessageUpdate[]): Promise<void> {
    const message: Message = await method.apply(this, args);
    const chatId = message.chat!.id;
    const lastMessage = await lastMessageRepo.getLastMessage(prefix, chatId);

    if (lastMessage) {
      try {
        await Bot.getInstance().app.telegram.deleteMessage(chatId, lastMessage);
      } catch (err) {
        Bot.handleError(new Error(`Can't delete last message for chat ${chatId}`));
      }
    }

    await lastMessageRepo.setLastMessage(prefix, chatId, message.message_id);
  };
};

export default DeleteLastMessage;
