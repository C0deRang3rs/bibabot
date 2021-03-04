import { Context } from 'telegraf/typings/context';
import GlobalHelper from '../utils/global.helper';
import RepliableError from '../types/globals/repliable.error';
import Bot from '../core/bot';

// eslint-disable-next-line max-len
const ReplyWithError = (returnErrorMessage = false, throwError = false) => (_target: object, _propKey: string, desc: PropertyDescriptor): void => {
  const method: Function = desc.value;

  // eslint-disable-next-line no-param-reassign
  desc.value = async function wrapped(...args: [Context, Function | undefined]): Promise<object> {
    let result;
    let errMessage;

    try {
      result = await method.apply(this, args);
    } catch (err) {
      if (err instanceof RepliableError) {
        errMessage = await GlobalHelper.sendError(args[0], err.message);
      } else {
        Bot.handleError(err);
      }

      if (throwError) {
        throw err;
      }

      if (returnErrorMessage && errMessage) {
        return errMessage;
      }

      if (args[1] && typeof args[1] === 'function') {
        args[1]();
      }
    }

    return result;
  };
};

export default ReplyWithError;
