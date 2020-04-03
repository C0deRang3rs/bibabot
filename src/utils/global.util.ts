import { ContextMessageUpdate } from 'telegraf';

const getUsernameFromContext = (ctx: ContextMessageUpdate): string => {
  const user = (ctx.message && ctx.message!.from!) || ctx.from!;
  return user.username
    ? `@${user.username}` : `${user.first_name}${user.last_name
      ? ` ${user.last_name}` : ''}`;
};

export default getUsernameFromContext;
