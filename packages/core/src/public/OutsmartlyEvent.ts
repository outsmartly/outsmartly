import { OutsmartlyClientVisitor, OutsmartlyEdgeVisitor, OutsmartlyRequest, OutsmartlyVisitor } from './types';
import { OutsmartlyCookies, OutsmartlyReadonlyCookies } from './OutsmartlyCookies';
import { MessageBus } from './MessageBus';
import { MessageBusMessage } from './MessageBusMessage';
import { ClientMessageBus } from './ClientMessageBus';
import { EdgeMessageBus } from './EdgeMessageBus';

export abstract class OutsmartlyEvent extends Event {
  abstract messageBus: MessageBus;
  abstract visitor: OutsmartlyVisitor;
}

export interface OutsmartlyMessageEvent<T extends string, D> extends OutsmartlyEvent {
  message: MessageBusMessage<T, D>;
}

export abstract class OutsmartlyClientEvent extends OutsmartlyEvent {
  constructor(
    type: string,
    public override messageBus: ClientMessageBus,
    public override visitor: OutsmartlyClientVisitor,
  ) {
    super(type);
  }
}

export class OutsmartlyClientMessageEvent<T extends string, D>
  extends OutsmartlyClientEvent
  implements OutsmartlyMessageEvent<T, D>
{
  declare type: 'outsmartlyclientmessage';

  constructor(messageBus: ClientMessageBus, visitor: OutsmartlyClientVisitor, public message: MessageBusMessage<T, D>) {
    super('outsmartlyclientmessage', messageBus, visitor);
  }
}

export declare abstract class OutsmartlyEdgeEvent extends OutsmartlyEvent {
  // no extensions currently
}

export declare abstract class OutsmartlyEdgeRequestEvent extends OutsmartlyEdgeEvent {
  override get messageBus(): EdgeMessageBus;
  override get visitor(): OutsmartlyEdgeVisitor;
  get request(): OutsmartlyRequest;
  get url(): URL;
  get state(): {
    [key: string]: unknown;
  };
  get cookies(): OutsmartlyCookies;
  waitUntil(promise: Promise<unknown>): void;
  log(...args: any[]): void;
  warn(...args: any[]): void;
  error(...args: any[]): void;
}

export declare class OutsmartlyEdgeMessageEvent<T extends string, D>
  extends OutsmartlyEdgeEvent
  implements OutsmartlyMessageEvent<T, D>
{
  override messageBus: MessageBus;
  override visitor: OutsmartlyEdgeVisitor;
  override type: 'outsmartlyedgemessage';
  message: MessageBusMessage<T, D>;
  cookies: OutsmartlyReadonlyCookies;
}
