import Bot from '../core/bot';

export default abstract class BaseService {
  protected readonly bot: Bot;

  protected constructor() {
    this.bot = Bot.getInstance();
    this.initListeners();
  }

  protected abstract initListeners(): void;
}
