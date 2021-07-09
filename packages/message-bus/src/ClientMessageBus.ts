import { MessageBus } from './MessageBus';
import { MessageBusMessage } from './MessageBusMessage';

export class ClientMessageBus extends MessageBus {
  constructor() {
    super(writeToEdge);
  }
}

async function writeToEdge(messages: MessageBusMessage[]): Promise<void> {
  // etc
  // e.g. await fetch(`/__outsmartly__/messages`, { method: 'POST', body });
}
