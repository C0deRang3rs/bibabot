import { TelegrafContext } from 'telegraf/typings/context';
import Bot from '../core/bot';
import LastMessageRepository from '../repositories/last.message.repo';
import { getUpdatedMessage } from '../utils/lists.util';

const UpdateLastMessage = (prefix: string) => (_target: object, _propKey: string, desc: PropertyDescriptor): void => {
  const lastMessageRepo = new LastMessageRepository();
  const method: Function = desc.value;

  // eslint-disable-next-line no-param-reassign
  desc.value = async function wrapped(...args: [TelegrafContext]): Promise<object> {
    const result = await method.apply(this, args);
    const chatId = args[0].chat!.id;
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
        Bot.handleError(new Error(`Can't update message with type ${prefix} for chat ${chatId}`));
      }
    }

    return result;
  };
};

export default UpdateLastMessage;
