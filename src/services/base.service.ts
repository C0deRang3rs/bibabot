import Bot from '../core/bot';
import { BotListener } from '../types/core/bot.types';
import { CommandCategory } from '../types/globals/commands.types';

export default abstract class BaseService {
  protected readonly bot: Bot;

  protected categoryName!: CommandCategory;

  protected constructor() {
    this.bot = Bot.getInstance();
    this.initProps();
    this.applyListeners(this.initListeners());
  }

  protected initProps(): void {
    this.categoryName = CommandCategory.OTHER;
  }

  protected applyListeners(commands: BotListener[]): void {
    this.bot.addListeners(commands.map((listener) => ({
      ...listener,
      category: listener.category || this.categoryName,
    })));
  }

  protected abstract initListeners(): BotListener[];
}
