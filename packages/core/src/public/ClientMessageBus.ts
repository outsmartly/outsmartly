import { MessageBus, MessageBusListener, MessageBusOptions } from './MessageBus';
import { MessageBusMessage } from './MessageBusMessage';
import { OutsmartlyClientMessageEvent } from './OutsmartlyEvent';
import { OutsmartlyClientVisitor } from './types';

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
    listener: MessageBusListener<string, unknown>,
    message: MessageBusMessage<string, unknown>,
  ): void {
    const event = new OutsmartlyClientMessageEvent(this, this._visitor, message);
    this._waitUntil(listener(event));
  }
}
