import Bull from 'bull';
import { ChangeTitleService } from '../services/change-title.service';

export class Queue {
    private queue!: Bull.Queue;

    constructor() {
        this.initMain();
        this.initJobQueue();
    }

    private async initMain() {
        this.queue = new Bull('auto:renames', process.env.REDIS_URL as string);
    }

    private async initJobQueue() {
        this.queue.process(async (job, done) => await ChangeTitleService.getInstance().resolveRenames(done));
        await this.queue.add({}, { repeat: { cron: '* * * * *' } });
        console.log('Job queue created');
    }
}