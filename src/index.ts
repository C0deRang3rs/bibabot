import TrashService from './services/trash.service';
import ChangeTitleService from './services/change-title.service';
import BibaService from './services/biba.service';
import BibacoinService from './services/bibacoin.service';
import ShopService from './services/shop.service';
import GlobalService from './services/global.service';
import MemeService from './services/meme.service';
import ConfigService from './services/config.service';
import App from './core/app';
import StickerService from './services/sticker.service';

const app = new App([
  ChangeTitleService,
  BibaService,
  TrashService,
  BibacoinService,
  ShopService,
  GlobalService,
  MemeService,
  ConfigService,
  StickerService,
]);

app.start();
