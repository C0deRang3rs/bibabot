import GlobalService from '../services/global.service';
import Redis from './redis';
import Bot from './bot';
import Server from './server';
import Queue from './queue';
import { AppServices } from '../types/core/app.types';

export default class App {
  constructor(private services: AppServices[]) {}

  private static startCore(): void {
    Redis.getInstance();
    new Server();
    new Queue('auto:rename');
    new Queue('daily:checks');
  }

  private static startPostHandlers(): void {
    Bot.getInstance().applyListeners();
    GlobalService.getInstance().initMessageHandler();
  }

  public start(): void {
    App.startCore();
    this.startServices();
    App.startPostHandlers();
  }

  private startServices(): void {
    this.services.forEach((service) => {
      service.getInstance();
    });
  }
}
