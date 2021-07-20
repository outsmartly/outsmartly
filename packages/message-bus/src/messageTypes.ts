export type MessageDataByType = {
  'Commerce.Cart.CHECKOUT_STARTED': {
    items: {
      productId: string;
      quantity: number;
    }[];
  };
};
