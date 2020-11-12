import { TelegrafContext } from 'telegraf/typings/context';
import { User } from 'telegraf/typings/telegram-types';

// eslint-disable-next-line max-len
export const getUsernameFromUser = (user: User): string => (user.username ? `@${user.username}` : `${user.first_name}${user.last_name ? ` ${user.last_name}` : ''}`);

export const getUsernameFromContext = (ctx: TelegrafContext): string => {
  const user = (ctx.message && ctx.message!.from!) || ctx.from!;
  return getUsernameFromUser(user);
};
