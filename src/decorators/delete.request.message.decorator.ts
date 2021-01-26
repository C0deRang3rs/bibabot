import { TelegrafContext } from 'telegraf/typings/context';
import Bot from '../core/bot';

const DeleteRequestMessage = () => (_target: object, _propKey: string, desc: PropertyDescriptor): void => {
  const method: Function = desc.value;

  // eslint-disable-next-line no-param-reassign
  desc.value = async function wrapped(...args: [TelegrafContext, boolean | Function | undefined]): Promise<object> {
    const botId = (await Bot.getInstance().app.telegram.getMe()).id;
    const botUser = await Bot.getInstance().app.telegram.getChatMember(args[0].chat!.id, botId);

    if (botUser.can_delete_messages && args[0].message) {
      try {
        await args[0].deleteMessage();
      } catch (err) {
        Bot.handleError(new Error(`Can't delete last message for chat ${args[0].chat!.id}`));
      }
    }

    return method.apply(this, args);
  };
};

export default DeleteRequestMessage;
