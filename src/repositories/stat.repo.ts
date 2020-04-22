import BaseRepository from './base.repo';

export default class StatRepository extends BaseRepository {
  protected entityName = 'stat';
  private entitySuffix = 'count';

  public async getStatCount(statName: string): Promise<number> {
    const count = await this.redis.getAsync(`${this.entityName}:${statName}:${this.entitySuffix}`);

    if (!count) {
      return 0;
    }

    return parseInt(count, 10);
  }

  public async incrementStatCount(statName: string): Promise<void> {
    const query = `${this.entityName}:${statName}:${this.entitySuffix}`;
    const previousResult = await this.getStatCount(statName);
    const newCount = previousResult ? previousResult + 1 : 1;

    await this.redis.setAsync(query, newCount.toString());
  }
}
