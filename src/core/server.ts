import express from 'express';

export class Server {
    private app: express.Application;

    constructor() {
        this.app = express();
        this.listen();
    }

    public listen() {
        const port = process.env.PORT || 3000;
        this.app.listen(port, () => console.log('Server is listening at ' + port));
    }
}