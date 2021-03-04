import { Context } from 'telegraf/typings/context';
import Bot from '../core/bot';
import LastMessageRepository from '../repositories/last.message.repo';
import { getUpdatedMessage } from '../utils/lists.util';

const UpdateLastMessage = (prefix: string) => (_target: object, _propKey: string, desc: PropertyDescriptor): void => {
  const lastMessageRepo = new LastMessageRepository();
  const method: Function = desc.value;

  // eslint-disable-next-line no-param-reassign
  desc.value = async function wrapped(...args: [Context | number]): Promise<object> {
    const result = await method.apply(this, args);

    const chatId = typeof args[0] === 'number' ? args[0] : args[0].chat!.id;
    const lastMessage = await lastMessageRepo.getLastMessage(prefix, chatId);

    if (lastMessage) {
      try {
        const { text, extra } = await getUpdatedMessage(prefix, chatId);
        await Bot.getInstance().app.telegram.editMessageText(
          chatId,
          lastMessage,
          undefined,
          text,
          extra,
        );
      } catch (err) {
        Bot.handleError(`Error: ${err.description} in UpdateLastMessage decorator`);
      }
    }

    return result;
  };
};

export default UpdateLastMessage;
