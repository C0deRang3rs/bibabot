import ChatRepository from '../repositories/chat.repo';
import { BotListener } from '../types/core/bot.types';
import BaseService from './base.service';

export default class ChatService extends BaseService {
  private static instance: ChatService;

  private constructor(
    private readonly chatRepo: ChatRepository,
  ) {
    super();
  }

  public static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService(
        new ChatRepository(),
      );
    }

    return ChatService.instance;
  }

  public async getAllChats(): Promise<number[]> {
    return this.chatRepo.getAllChats();
  }

  public async getChat(chatId: number): Promise<string | null> {
    return this.chatRepo.getChat(chatId);
  }

  public async addChat(chatId: number): Promise<void> {
    return this.chatRepo.addChat(chatId);
  }

  // eslint-disable-next-line class-methods-use-this
  protected initListeners(): BotListener[] {
    return [];
  }
}
