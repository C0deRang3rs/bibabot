import { ContextMessageUpdate } from 'telegraf';

export default class RepliableError extends Error {
  constructor(message: string, public ctx: ContextMessageUpdate) {
    super(message);
  }
}
