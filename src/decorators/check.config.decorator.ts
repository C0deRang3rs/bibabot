import { ContextMessageUpdate } from 'telegraf';
import ConfigService from '../services/config.service';
import { ConfigProperty } from '../types/services/config.service.types';

const CheckConfig = (property: ConfigProperty) => (_target: object, _propKey: string, desc: PropertyDescriptor): void => {
  const method: Function = desc.value;

  // eslint-disable-next-line no-param-reassign
  desc.value = async function wrapped(...args: Array<ContextMessageUpdate | number | Function>): Promise<void> {
    let chatId: number;

    switch (typeof args[0]) {
      case 'number': chatId = args[0]; break;
      case "object": chatId = args[0].chat!.id
    }
    
    const nextMethod = args[1];
    const isAllowed = await ConfigService.getInstance().checkProperty(chatId!, property);

    if (!isAllowed) {
      if (nextMethod && typeof nextMethod === 'function') return nextMethod();
      return;
    }

    await method.apply(this, args);
  };
};

export default CheckConfig;
