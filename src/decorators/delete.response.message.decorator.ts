import { TelegrafContext } from 'telegraf/typings/context';
import Bot from '../core/bot';

const DeleteResponseMessage = (time: number) => (_target: object, _propKey: string, desc: PropertyDescriptor): void => {
  const method: Function = desc.value;

  // eslint-disable-next-line no-param-reassign
  desc.value = async function wrapped(...args: TelegrafContext[]): Promise<void> {
    const message = await method.apply(this, args);
    setTimeout(() => Bot.getInstance().app.telegram.deleteMessage(args[0].chat!.id, message.message_id), time);
  };
};

export default DeleteResponseMessage;
