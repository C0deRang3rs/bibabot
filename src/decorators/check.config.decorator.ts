import { ContextMessageUpdate } from 'telegraf';
import ConfigService from '../services/config.service';
import { ConfigProperty } from '../types/services/config.service.types';

const CheckConfig = (property: ConfigProperty) => (_target: object, _propKey: string, desc: PropertyDescriptor): void => {
  const method: Function = desc.value;

  // eslint-disable-next-line no-param-reassign
  desc.value = async function wrapped(...args: ContextMessageUpdate[]): Promise<void> {
    const chatId = args[0].chat!.id;
    const isAllowed = await ConfigService.getInstance().checkProperty(chatId, property);

    if (!isAllowed) {
      throw new Error('This command is not allowed on this chat');
    }

    await method.apply(this, args);
  };
};

export default CheckConfig;
