import { Context } from 'telegraf';
import {
  CommandArguments, CommandType, getExampleByCommandType, getRegexByCommandType,
} from '../types/core/bot.types';
import RepliableError from '../types/globals/repliable.error';

// todo: smart split for spaced text arguments
const CommandTemplate = (template: CommandArguments) => (_target: object, _propKey: string, desc: PropertyDescriptor): void => {
  const method: Function = desc.value;
  // eslint-disable-next-line no-param-reassign
  desc.value = async function wrapped(...args: [Context, number]): Promise<object> {
    const ctx = args[0];

    if (!ctx.message || !('text' in ctx.message)) {
      throw new RepliableError('Wrong format', ctx);
    }

    const list = ctx.message.text.split(' ');
    let command = list[0];

    if (command.includes('@')) {
      [command] = command.split('@');
    }

    const multipleArgsIndex = template.indexOf(CommandType.ANY_CHARS);

    const argumentList = list.splice(1);

    if (multipleArgsIndex !== -1) {
      argumentList[multipleArgsIndex - 1] = argumentList.splice(multipleArgsIndex - 1).join(' ');
    }

    const requiredArgsLength = template.filter((c) => c!.split('').pop() !== '?').length - 1;

    // eslint-disable-next-line max-len
    const isInvalid = (argumentList.length <= template.length - 1) && (argumentList.length >= requiredArgsLength) ? argumentList.some((argument, index) => !new RegExp(getRegexByCommandType(template[index + 1]!.replace('?', '') as CommandType)).test(argument)) : true;

    if (isInvalid) {
      throw new RepliableError(
        `Команда должна использоваться так:\n${template
          .map((element) => getExampleByCommandType(element!, command))
          .join(' ')}`,
        ctx,
      );
    }

    return method.apply(this, args);
  };
};

export default CommandTemplate;
