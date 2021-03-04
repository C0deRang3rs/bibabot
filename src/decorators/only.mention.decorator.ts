import { Context } from 'telegraf/typings/context';
import GlobalHelper from '../utils/global.helper';

const OnlyMention = (sendError = true) => (_target: object, _propKey: string, desc: PropertyDescriptor): void => {
  const method: Function = desc.value;

  // eslint-disable-next-line no-param-reassign
  desc.value = async function wrapped(...args: [Context, Function | undefined]): Promise<object> {
    const ctx = args[0];
    const next = args[1];

    if (
      !ctx.message
      || !('text' in ctx.message)
    ) {
      return {};
    }

    const botName = ctx.me;

    if (ctx.message.text !== `@${botName}` || (ctx.message.entities && ctx.message.entities[0].type !== 'mention')) {
      if (next) next();
      if (sendError) await GlobalHelper.sendError(ctx, 'Эта функция доступа только для тегов');
      return {};
    }

    return method.apply(this, args);
  };
};

export default OnlyMention;
