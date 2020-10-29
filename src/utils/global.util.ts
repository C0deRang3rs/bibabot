import { TelegrafContext } from 'telegraf/typings/context';
import BibaRepository from '../repositories/biba.repo';
import { NO_TABLE_DATA } from '../types/services/biba.service.types';

export const getUsernameFromContext = (ctx: TelegrafContext): string => {
  const user = (ctx.message && ctx.message!.from!) || ctx.from!;
  return user.username
    ? `@${user.username}` : `${user.first_name}${user.last_name
      ? ` ${user.last_name}` : ''}`;
};

export const getBibaTableText = async (chatId: number): Promise<string> => {
  const bibaRepo = new BibaRepository();
  const allBibas = await bibaRepo.getAllBibasByChatId(chatId);

  if (!allBibas.length) {
    return NO_TABLE_DATA;
  }

  const message = allBibas.map((biba, index) => `${index + 1}. ${biba.username.replace('@', '')} - ${biba.size} см`);
  return message.join('\n');
};
