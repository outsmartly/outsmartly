import { MessageBusMessage } from './MessageBusMessage';

export class MessageBus {
  constructor(private writeToExternal: (messages: MessageBusMessage[]) => Promise<void>) {}
  // etc
}
