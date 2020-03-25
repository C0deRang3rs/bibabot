import { ContextMessageUpdate } from 'telegraf';
import Bot from '../core/bot';

const DeleteRequestMessage = () => (_target: object, _propKey: string, desc: PropertyDescriptor): void => {
  const method: Function = desc.value;

  // eslint-disable-next-line no-param-reassign
  desc.value = async function wrapped(...args: ContextMessageUpdate[]): Promise<void> {
    const botId = (await Bot.getInstance().app.telegram.getMe()).id;
    const botUser = await Bot.getInstance().app.telegram.getChatMember(args[0].chat!.id, botId);

    await method.apply(this, args);

    if (botUser.can_delete_messages) {
      await args[0].deleteMessage();
    }
  };
};

export default DeleteRequestMessage;
