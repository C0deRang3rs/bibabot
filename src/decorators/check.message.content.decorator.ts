import { Context } from 'telegraf/typings/context';
import { MessageContent } from '../types/globals/message.types';

const CheckMessageContent = (type: MessageContent) => (_target: object, _propKey: string, desc: PropertyDescriptor): void => {
  const method: Function = desc.value;

  // eslint-disable-next-line no-param-reassign
  desc.value = async function wrapped(...args: [Context, Function | undefined]): Promise<object> {
    let isAllowed;
    const ctx = args[0];

    if (
      !ctx.message
    ) {
      return {};
    }

    switch (type) {
      case MessageContent.PHOTO: isAllowed = !!('photo' in ctx.message); break;
      default: isAllowed = true;
    }

    if (!isAllowed) {
      if (typeof args[1] === 'function') {
        args[1]!();
      }

      return {};
    }

    return method.apply(this, args);
  };
};

export default CheckMessageContent;
