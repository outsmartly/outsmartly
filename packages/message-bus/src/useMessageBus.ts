import { ClientMessageBus } from './ClientMessageBus';
import { MessageBus } from './MessageBus';

// Lazily creating as a micro-optimization for initial bundle evaluation.
// Today, it probably doesn't matter, but "just in case" it's easy enough
// since singletons are generally not great practice to begin with.
// We'll likely want to use React Context at some point, but that would
// require this lib to import/depend on it (making npm linking harder)
// and also making ESR potentially more difficult right now.
let messageBus: ClientMessageBus | undefined;

/**
 * Custom hook that decouples importing the client-side message bus from its
 * use by consumers. Allows us to add functionality to all instances.
 */
export function useMessageBus(): MessageBus {
  // If someone uses this "hook" in their edge code, it should still work as expected
  // which means it needs to use the EdgeMessageBus, instead.
  if (typeof window === 'undefined' && typeof __OUTSMARTLY_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_HIRED__ === 'object') {
    return __OUTSMARTLY_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_HIRED__.messageBus;
  }

  if (!messageBus) {
    messageBus = new ClientMessageBus();
  }

  return messageBus;
}
