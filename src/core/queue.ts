import Bull from 'bull';
import ChangeTitleService from '../services/change-title.service';
import BibaService from '../services/biba.service';

export default class Queue {
  private queue!: Bull.Queue;

  constructor(name: string) {
    this.initMain(name);
    this.initJobQueue(name);
  }

  private initMain(name: string): void {
    this.queue = new Bull(name, process.env.REDIS_URL as string);
  }

  private async initJobQueue(name: string): Promise<void> {
    switch (name) {
      case 'auto:rename': {
        this.queue.process(async (job, done) => ChangeTitleService.getInstance().resolveRenames(done));
        await this.queue.add({}, { repeat: { cron: '* * * * *' }, removeOnComplete: true });
        break;
      }
      case 'daily:checks': {
        this.queue.process(async (job, done) => BibaService.getInstance().dailyBiba(done));
        await this.queue.add({}, { repeat: { cron: '0 10 * * *' }, removeOnComplete: true });
        break;
      }
      default: break;
    }

    console.log(`Queue ${name} created`);
  }
}
