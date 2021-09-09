import { EdgeMessageBus } from '@outsmartly/core';
import { addToCart } from './addToCart';
import { pageView } from './pageView';

const OUTSMARTLY_ADD_TO_CART: string = 'Commerce.Cart.ADD_TO_CART';
const OUTSMARTLY_PAGE_VIEW: string = 'Commerce.PAGE_VIEW';

export function configure(messageBus: EdgeMessageBus) {
  messageBus.on(OUTSMARTLY_ADD_TO_CART, addToCart);
  messageBus.on(OUTSMARTLY_PAGE_VIEW, pageView);
}
