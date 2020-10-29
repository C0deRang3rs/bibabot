import { StickerSet } from '../types/services/sticker.service.types';
import BaseRepository from './base.repo';

export default class StickerSetRepository extends BaseRepository {
  protected entityName = 'sticker_set';

  public async getStickerSet(chatId: number): Promise<StickerSet | null> {
    const stickerSet = await this.redis.getAsync(`${this.entityName}:${chatId}`);

    if (!stickerSet) {
      return null;
    }

    const parsed = JSON.parse(stickerSet);

    return parsed || null;
  }

  public async setStickerSet(chatId: number, ownerId: number, name: string): Promise<void> {
    await this.redis.setAsync(`${this.entityName}:${chatId}`, JSON.stringify({ ownerId, name }));
  }
}
