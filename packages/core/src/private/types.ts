import { MessageBus } from '../public/MessageBus';
import { OutsmartlyClientVisitor, OutsmartlyVisitor } from '../public/types';

// Internal implementation details, not publicly accessible.
// export type Context = unknown;

export interface Context {
  messageBus: MessageBus;
  visitor: OutsmartlyVisitor;
}

// Internal implementation details
export interface ClientContext extends Context {
  visitor: OutsmartlyClientVisitor;
}
