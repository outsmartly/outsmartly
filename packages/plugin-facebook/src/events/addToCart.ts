const FB_ADD_TO_CART: string = 'AddToCart';
import { sendFbEvent } from '../fbevents';
import { OutsmartlyEdgeMessageEvent } from '@outsmartly/core';

interface AddToCartData {
  event_source_url: string;
  customer_data: any;
  custom_data: any;
}
type AddToCartMessageEvent = OutsmartlyEdgeMessageEvent<
  typeof FB_ADD_TO_CART,
  AddToCartData
>;
export async function addToCart(event: AddToCartMessageEvent) {
  const { message } = event;
  const { event_source_url, customer_data, custom_data } = message.data;

  await sendFbEvent({
    event,
    event_name: FB_ADD_TO_CART,
    event_source_url,
    customer_data,
    custom_data,
  });
}
