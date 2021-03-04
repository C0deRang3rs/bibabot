import { Context } from 'telegraf/typings/context';
import RepliableError from '../types/globals/repliable.error';

const OnlyReply = (sendError = true) => (_target: object, _propKey: string, desc: PropertyDescriptor): void => {
  const method: Function = desc.value;

  // eslint-disable-next-line no-param-reassign
  desc.value = async function wrapped(...args: [Context, Function | undefined]): Promise<object> {
    const ctx = args[0];
    const next = args[1];

    if (!ctx.message || !('reply_to_message' in ctx.message)) {
      if (next) next();
      if (sendError) throw new RepliableError('Эта функция доступа только для реплаев', ctx);
      return {};
    }

    return method.apply(this, args);
  };
};

export default OnlyReply;
