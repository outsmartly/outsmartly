import { MessageBus } from '../public/MessageBus';
import { OutsmartlyClientVisitor, OutsmartlyVisitor } from '../public/types';

export interface Context {
  messageBus: MessageBus;
  visitor: OutsmartlyVisitor;
}

export interface ClientContext extends Context {
  visitor: OutsmartlyClientVisitor;
}
