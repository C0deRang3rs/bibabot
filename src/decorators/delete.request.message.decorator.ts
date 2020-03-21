import { ContextMessageUpdate } from 'telegraf';

const DeleteRequestMessage = () => (_target: object, _propKey: string, desc: PropertyDescriptor): void => {
  const method: Function = desc.value;

  // eslint-disable-next-line no-param-reassign
  desc.value = async function wrapped(...args: ContextMessageUpdate[]): Promise<void> {
    await method.apply(this, args);
    await args[0].deleteMessage();
  };
};

export default DeleteRequestMessage;
