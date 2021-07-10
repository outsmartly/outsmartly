import { MessageBus } from './MessageBus';
import { MessageBusMessage } from './MessageBusMessage';

export class EdgeMessageBus extends MessageBus {
  constructor() {
    super(writeToBigQuery);
  }
}

async function writeToBigQuery(_messages: MessageBusMessage[]): Promise<void> {
  // write the array to big query here
  return new Promise((resolve) => {
    _messages.forEach(m => {
      console.log(m);
    });
    resolve();
  })
}

const edgeBus = new EdgeMessageBus();

edgeBus.on('exampleEvent', (message: MessageBusMessage) => {
  console.log(message.type, message.data);
});
