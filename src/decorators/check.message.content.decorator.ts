import { TelegrafContext } from 'telegraf/typings/context';
import { MessageContent } from '../types/globals/message.types';

const CheckMessageContent = (type: MessageContent) => (_target: object, _propKey: string, desc: PropertyDescriptor): void => {
  const method: Function = desc.value;

  // eslint-disable-next-line no-param-reassign
  desc.value = async function wrapped(...args: [TelegrafContext, Function | undefined]): Promise<void | Function> {
    let isAllowed;
    const ctx = args[0];

    switch (type) {
      case MessageContent.PHOTO: isAllowed = !!ctx.message!.photo; break;
      default: isAllowed = true;
    }

    if (!isAllowed) {
      if (typeof args[1] === 'function') {
        args[1]!();
      }

      return;
    }

    await method.apply(this, args);
  };
};

export default CheckMessageContent;
