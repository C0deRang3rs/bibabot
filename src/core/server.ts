import express from 'express';
import bodyParser from 'body-parser';

import path from 'path';

export default class Server {
  private app: express.Application;

  constructor() {
    this.app = express();
    this.app.set('view engine', 'hbs');
    this.app.set('views', path.join(__dirname, '../../imageTemplates'));
    this.app.use(bodyParser.json());

    this.listen();
  }

  public listen(): void {
    const port = process.env.PORT || 3000;

    this.app.get('/img', (request, response) => {
      const {
        messageAuthor, text, time, color,
      } = request.body;

      response.render('message.hbs', {
        messageAuthor: messageAuthor || { first_name: 'Миша', last_name: 'Кузьмич' },
        text: text || 'Тестовый комментарий',
        time: time || '13:18',
        color: color || 'deepskyblue',
      });
    });

    this.app.listen(port, () => console.log(`Server is listening at ${port}`));
  }
}
