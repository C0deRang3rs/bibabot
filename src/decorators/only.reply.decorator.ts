import { TelegrafContext } from 'telegraf/typings/context';
import GlobalHelper from '../utils/global.helper';

const OnlyReply = (sendError = true) => (_target: object, _propKey: string, desc: PropertyDescriptor): void => {
  const method: Function = desc.value;

  // eslint-disable-next-line no-param-reassign
  desc.value = async function wrapped(...args: [TelegrafContext, Function | undefined]): Promise<object> {
    const ctx = args[0];
    const next = args[1];

    if (!ctx.message || !ctx.message.reply_to_message) {
      if (next) next();
      if (sendError) await GlobalHelper.sendError(ctx, 'Эта функция доступа только для реплаев');
      return {};
    }

    return method.apply(this, args);
  };
};

export default OnlyReply;
