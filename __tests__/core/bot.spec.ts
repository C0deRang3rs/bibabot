import Bot from '../../src/core/bot';

jest.mock('telegraf', () => jest.fn().mockImplementation(() => ({
  launch: jest.fn(),
  catch: jest.fn(),
})));

describe('Bot class', () => {
  test('Bot should be defined', () => {
    const bot = Bot.getInstance();

    expect(bot).toBeDefined();
  });
});
