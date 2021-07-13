import { ClientMessageBus } from './ClientMessageBus';

const messageBus = new ClientMessageBus();

/**
 * Custom hook that decouples importing the client-side message bus from its
 * use by consumers. Allows us to add functionality to all instances.
 */
export function useMessageBus() {
  return messageBus;
}
