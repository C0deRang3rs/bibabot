export enum Product {
  BIBA_CM = 'biba_cm',
  BIBA_REROLL = 'biba_reroll',
}

export enum ShopAction {
  BUY_CM = 'buy_cm',
  BUY_REROLL = 'buy_reroll',
}

export const ProductPrice: Record<Product, number> = {
  [Product.BIBA_CM]: 10,
  [Product.BIBA_REROLL]: 30,
};

export const ProductToActionMap: Record<Product, ShopAction> = {
  [Product.BIBA_CM]: ShopAction.BUY_CM,
  [Product.BIBA_REROLL]: ShopAction.BUY_REROLL,
};
