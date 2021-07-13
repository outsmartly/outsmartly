import { MessageBus } from './MessageBus';
import { MessageBusMessage } from './MessageBusMessage';

export class ClientMessageBus extends MessageBus {
  constructor() {
    super(writeToEdge);
  }
}

async function writeToEdge(messages: MessageBusMessage[]): Promise<void> {
  // Make API call to send the event to Outsmartly's edge
  fetch('/__outsmartly__/message-bus', {
    method: 'POST',
    body: JSON.stringify(messages),
    headers: { 'Content-Type': 'application/json' },
  });
}
