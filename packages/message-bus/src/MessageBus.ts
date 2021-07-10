import { latestEvent } from './env';
import { MessageBusMessage } from './MessageBusMessage';

/**
 * Message listeners (i.e., event listeners) must be of this function type.
 */
 type MessageBusListener<T extends string, D> = (
  message: MessageBusMessage<T, D>,
) => Promise<void> | void;

/**
 * The MessageBus class. Can be used either client-side or edge-side. A
 * MessageBus maintains a Map of listeners, where each key is an event type
 * (string) and each value is a Set of listeners that execute when that event
 * type occurs. Methods:
 * - on: attach an event listener
 * - off: remove an event listener
 * - once: attach an event listener that will run only one time
 * - emit: dispatch an event
 */
 export class MessageBus {
  private _listenersByMessageType = new Map<
    string,
    Set<MessageBusListener<string, unknown>>
  >();

  /**
   * Consumer must pass in a function that writes an array of emitted events to
   * some desired location.
   */
  constructor(
    private writeToExternal: (batch: MessageBusMessage[]) => Promise<void>,
  ) {}

  /** Attach an event listener */
  on(messageType: string, callback: MessageBusListener<string, unknown>): this;
  on(messageType: string, callback: MessageBusListener<any, any>): this {
    // If it doesn't already have a listener for this message type, add one.
    if (!this._listenersByMessageType.has(messageType)) {
      this._listenersByMessageType.set(messageType, new Set());
    }
    // Grab the Set of listeners for this message type
    const listeners = this._listenersByMessageType.get(messageType)!;
    listeners.add(callback);

    return this;
  }

  /** Remove an event listener */
  off(messageType: string, callback: MessageBusListener<string, unknown>): this;
  off(messageType: string, callback: MessageBusListener<any, any>): this {
    const listeners = this._listenersByMessageType.get(messageType);
    if (!listeners) {
      return this;
    }
    listeners.delete(callback);

    return this;
  }

  /** Attach an event listener that will run only once */
  once(
    messageType: string,
    callback: MessageBusListener<string, unknown>,
  ): this;
  once(messageType: string, callback: MessageBusListener<any, any>): this {
    const outerCallback: MessageBusListener<string, unknown> = (message) => {
      this.off(messageType, outerCallback);
      callback(message);
    };
    this.on(messageType, outerCallback);

    return this;
  }

  /** Emit an event (i.e. trigger, fire) */
  emit(type: string, data: unknown): this;
  emit<T>(type: string, data: T): this {
    latestEvent.waitUntil(this._throttledWriteToExternal({ type, data }));

    // Execute the listeners for this message
    const listeners = this._listenersByMessageType.get(type);
    if (!listeners) {
      return this;
    }

    for (const listener of Array.from(listeners)) {
      const message = new MessageBusMessage(type, data);
      latestEvent.waitUntil(listener(message));
    }

    return this;
  }

  // An array to hold emitted events
  private _batch: MessageBusMessage[] = [];
  private _wait: number = 250;
  private _timerId: ReturnType<typeof setTimeout> | null = null;

  _throttledWriteToExternal(message: {
    type: string;
    data: unknown;
  }): Promise<void> {
    return new Promise((resolve) => {
      // Push current message to batch
      this._batch.push(message);
      // If a timer is already running, resolve the Promise and return
      if (this._timerId) {
        resolve();
        return;
      }
      // If not, start one
      this._timerId = setTimeout(() => {
        this.writeToExternal(this._batch);
        this._batch = [];
        this._timerId = null;
        resolve();
      }, this._wait);
    });
  }
}
