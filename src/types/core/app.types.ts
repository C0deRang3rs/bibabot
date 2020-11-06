import ChangeTitleService from '../../services/change-title.service';
import BibaService from '../../services/biba.service';
import TrashService from '../../services/trash.service';
import BibacoinService from '../../services/bibacoin.service';
import ShopService from '../../services/shop.service';
import GlobalService from '../../services/global.service';
import MemeService from '../../services/meme.service';
import ConfigService from '../../services/config.service';
import StickerService from '../../services/sticker.service';

export type AppServices =
  typeof ChangeTitleService |
  typeof BibaService |
  typeof TrashService |
  typeof BibacoinService |
  typeof ShopService |
  typeof GlobalService |
  typeof MemeService |
  typeof StickerService |
  typeof ConfigService;
