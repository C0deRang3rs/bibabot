import { TelegrafContext } from 'telegraf/typings/context';
import GlobalHelper from '../utils/global.helper';
import RepliableError from '../types/globals/repliable.error';
import Bot from '../core/bot';

const ReplyWithError = () => (_target: object, _propKey: string, desc: PropertyDescriptor): void => {
  const method: Function = desc.value;

  // eslint-disable-next-line no-param-reassign
  desc.value = async function wrapped(...args: [TelegrafContext, Function | undefined]): Promise<object> {
    let result;

    try {
      result = await method.apply(this, args);
    } catch (err) {
      if (err instanceof RepliableError) {
        await GlobalHelper.sendError(args[0], err.message);
      } else {
        Bot.handleError(err);
      }
      if (args[1]) {
        args[1]();
      }
    }

    return result;
  };
};

export default ReplyWithError;
