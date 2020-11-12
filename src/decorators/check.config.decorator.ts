import { TelegrafContext } from 'telegraf/typings/context';
import ConfigService from '../services/config.service';
import { ConfigProperty } from '../types/services/config.service.types';
import { MemeAction } from '../types/services/meme.service.types';

const CheckConfig = (property: ConfigProperty) => (_target: object, _propKey: string, desc: PropertyDescriptor): void => {
  const method: Function = desc.value;

  // eslint-disable-next-line no-param-reassign
  desc.value = async function wrapped(
    ...args: [TelegrafContext | number, Function | number | boolean | MemeAction | undefined]
  ): Promise<object> {
    let chatId: number;

    switch (typeof args[0]) {
      case 'number': [chatId] = args; break;
      case 'object': chatId = args[0].chat!.id; break;
      default: return {};
    }

    const secondArgument = args[1];
    const isAllowed = await ConfigService.getInstance().checkProperty(chatId!, property);

    if (!isAllowed) {
      if (typeof secondArgument !== 'boolean' || (typeof secondArgument === 'boolean' && secondArgument)) {
        if (typeof args[1] === 'function') {
          args[1]();
        }

        return {};
      }
    }

    return method.apply(this, args);
  };
};

export default CheckConfig;
