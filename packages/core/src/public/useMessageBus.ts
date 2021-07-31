import { ClientMessageBus } from './ClientMessageBus';
import { MessageBus, MessageBusOptions } from './MessageBus';
import { OutsmartlyClientVisitor } from './types';

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
export function useMessageBus(options?: MessageBusOptions): MessageBus {
  if (!messageBus) {
    const visitor: OutsmartlyClientVisitor = {
      id: getVisitorId(),
    };
    messageBus = new ClientMessageBus(visitor, options);
  }

  return messageBus;
}

function getVisitorId(): string {
  // When doing SSR/SSG. Technically if they ever some how on() and emit()
  // on the origin server they'd now get an empty string for a visitor ID,
  // which isn't ideal, but they'd be breaking the rules of React anyway.
  if (typeof document === 'undefined') {
    return '';
  }

  const input = document.cookie;
  // We probably want to eventually error when this happens,
  // but for now we won't because it would error during local
  // dev mode, where Outsmartly's edge isn't in front of it.
  if (input === '') {
    return '';
  }

  const parts = input.split(';');

  for (let i = 0, l = parts.length; i < l; i++) {
    const [name, value] = parts[i].split('=');
    if (name === 'Outsmartly-Session') {
      return value;
    }
  }

  // Similar to empty document.cookie above, probably should
  // eventually error, but not for now.
  return '';
}
