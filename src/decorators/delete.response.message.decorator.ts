import { Context } from 'telegraf/typings/context';
import Bot from '../core/bot';

const DeleteResponseMessage = (time: number) => (_target: object, _propKey: string, desc: PropertyDescriptor): void => {
  const method: Function = desc.value;

  // eslint-disable-next-line no-param-reassign
  desc.value = async function wrapped(...args: [Context]): Promise<object> {
    const message = await method.apply(this, args);

    const chatId = typeof args[0] === 'number' ? args[0] : args[0].chat!.id;

    if (message) {
      setTimeout(() => Bot.getInstance().app.telegram.deleteMessage(chatId, message.message_id), time);
    }

    return message;
  };
};

export default DeleteResponseMessage;
