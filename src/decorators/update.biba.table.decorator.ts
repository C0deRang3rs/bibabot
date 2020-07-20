import { ContextMessageUpdate } from 'telegraf';
import Bot from '../core/bot';
import LastMessageRepository from '../repositories/last.message.repo';
import { getBibaTableText } from '../utils/global.util';

const lastMessageRepo = new LastMessageRepository();

const UpdateBibaTable = () => (_target: object, _propKey: string, desc: PropertyDescriptor): void => {
  const method: Function = desc.value;

  // eslint-disable-next-line no-param-reassign
  desc.value = async function wrapped(...args: ContextMessageUpdate[]): Promise<void> {
    await method.apply(this, args);
    const chatId = args[0].chat!.id;
    const lastMessage = await lastMessageRepo.getLastMessage('biba_table', chatId);

    if (lastMessage) {
      try {
        await Bot.getInstance().app.telegram.editMessageText(
          chatId,
          lastMessage,
          undefined,
          await getBibaTableText(chatId),
        );
      } catch (err) {
        Bot.handleError(new Error(`Can't update biba table for chat ${chatId}`));
      }
    }
  };
};

export default UpdateBibaTable;
