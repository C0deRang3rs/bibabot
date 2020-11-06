import { TelegrafContext } from 'telegraf/typings/context';

export default class RepliableError extends Error {
  constructor(message: string, public ctx: TelegrafContext) {
    super(message);
  }
}
