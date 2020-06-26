import { ContextMessageUpdate } from 'telegraf';
import { MessageContent } from '../types/globals/message.types';

const CheckMessageContent = (type: MessageContent) => (_target: object, _propKey: string, desc: PropertyDescriptor): void => {
  const method: Function = desc.value;

  // eslint-disable-next-line no-param-reassign
  desc.value = async function wrapped(...args: ContextMessageUpdate[]): Promise<void> {
    let isAllowed;

    switch (type) {
      case MessageContent.PHOTO: isAllowed = !!args[0].message!.photo; break;
      default: isAllowed = true;
    }

    if (!isAllowed) {
      return;
    }

    await method.apply(this, args);
  };
};

export default CheckMessageContent;
