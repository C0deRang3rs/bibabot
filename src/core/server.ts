import express from 'express';

export default class Server {
  private app: express.Application;

  constructor() {
    this.app = express();
    this.listen();
  }

  public listen(): void {
    const port = process.env.PORT || 3000;
    this.app.listen(port, () => console.log(`Server is listening at ${port}`));
  }
}
