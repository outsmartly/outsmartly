import { MessageBus } from './MessageBus';
import { MessageBusMessage } from './MessageBusMessage';

export class ClientMessageBus extends MessageBus {
  override async _writeToExternal(messages: MessageBusMessage[]): Promise<void> {
    const body = JSON.stringify(messages);
    // Using Blob so that Content-Type: application/json header is included
    const blob = new Blob([body], { type: 'application/json' });

    // sendBeacon is more reliable for cases where the browser window is closing,
    // although there's still some debate about that: https://volument.com/blog/sendbeacon-is-broken
    // We should also add code somewhere in Jackrabbit to listen for 'visibilitychange'
    // on the document and do a flushToExternal() at that point.
    navigator.sendBeacon('/.outsmartly/message-bus', blob);
  }

  override _waitUntil() {
    // Not needed clientside (unless some day this runs in Service Worker)
  }
}
