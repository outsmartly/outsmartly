import { MessageBus, MessageBusListener, MessageBusOptions } from './MessageBus';
import { MessageBusMessage } from './MessageBusMessage';
import { MessageDataByType } from './MessageDataByType';
import { OutsmartlyClientMessageEvent } from './OutsmartlyEvent';
import { OutsmartlyClientVisitor } from './types';

export type ClientMessageBusListener<T extends string, D> = MessageBusListener<OutsmartlyClientMessageEvent<T, D>>;

export class ClientMessageBus extends MessageBus {
  constructor(protected _visitor: OutsmartlyClientVisitor, options?: MessageBusOptions) {
    super(options);
  }

  protected override async _writeToExternal(messages: MessageBusMessage<string, unknown>[]): Promise<void> {
    const body = JSON.stringify(messages);
    // Using Blob so that Content-Type: application/json header is included
    const blob = new Blob([body], { type: 'application/json' });

    // sendBeacon is more reliable for cases where the browser window is closing,
    // although there's still some debate about that: https://volument.com/blog/sendbeacon-is-broken
    // We should also add code somewhere in Jackrabbit to listen for 'visibilitychange'
    // on the document and do a flushToExternal() at that point.
    navigator.sendBeacon('/.outsmartly/message-bus', blob);
  }

  protected override _waitUntil(_promise: Promise<unknown> | void) {
    // Not needed clientside (unless some day this runs in Service Worker)
  }

  protected override _notifyListener(
    listener: ClientMessageBusListener<string, unknown>,
    message: MessageBusMessage<string, unknown>,
  ): void {
    const event = new OutsmartlyClientMessageEvent(this, this._visitor, message);
    this._waitUntil(listener(event));
  }
}

export interface ClientMessageBus extends MessageBus {
  on<T extends keyof MessageDataByType>(type: T, callback: ClientMessageBusListener<T, MessageDataByType[T]>): this;
  on<T extends string, D = unknown>(
    type: T extends keyof MessageDataByType ? never : T,
    callback: ClientMessageBusListener<T, D>,
  ): this;
  on(type: string, callback: ClientMessageBusListener<any, any>): this;

  off<T extends keyof MessageDataByType>(type: T, callback: ClientMessageBusListener<T, MessageDataByType[T]>): this;
  off<T extends string, D = unknown>(
    type: T extends keyof MessageDataByType ? never : T,
    callback: ClientMessageBusListener<T, D>,
  ): this;

  once<T extends keyof MessageDataByType>(type: T, callback: ClientMessageBusListener<T, MessageDataByType[T]>): this;
  once<T extends string, D = unknown>(
    type: T extends keyof MessageDataByType ? never : T,
    callback: ClientMessageBusListener<T, D>,
  ): this;

  emit<T extends keyof MessageDataByType>(type: T, data: MessageDataByType[T]): this;
  emit<T extends string, D = unknown>(type: T extends keyof MessageDataByType ? never : T, data: D): this;
}
