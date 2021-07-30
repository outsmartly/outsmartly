import { MessageBusMessage } from './MessageBusMessage';
import { MessageDataByType } from './MessageDataByType';
import { OutsmartlyClientMessageEvent, OutsmartlyEvent, OutsmartlyMessageEvent } from './OutsmartlyEvent';
import { OutsmartlyVisitor } from './types';

/**
 * Message listeners (i.e., event listeners) must be of this function type.
 */
export type MessageBusListener<
  MessageType extends string,
  Data,
  MessageEvent extends OutsmartlyMessageEvent<MessageType, Data> = OutsmartlyMessageEvent<MessageType, Data>,
> = (event: MessageEvent) => Promise<void> | void;

export interface MessageBusOptions {
  debug?: boolean;
}

const defaultOptions: MessageBusOptions = {
  debug: false,
};

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
export abstract class MessageBus<Visitor extends OutsmartlyVisitor = OutsmartlyVisitor> {
  private _options: MessageBusOptions;
  private _listenersByMessageType = new Map<string, Set<MessageBusListener<string, unknown>>>();
  // Buffer to hold messages prior to writing them to the external destination.
  protected _throttleBuffer: MessageBusMessage<string, unknown>[] = [];
  protected _throttleDelay = 1000;
  protected _throttleTimerId: ReturnType<typeof setTimeout> | null = null;

  constructor(options?: MessageBusOptions) {
    this._options = {
      ...defaultOptions,
      ...options,
    };
  }

  protected abstract _writeToExternal(messages: MessageBusMessage<string, unknown>[]): Promise<void>;
  protected abstract _waitUntil(promise: Promise<unknown> | void): void;
  protected abstract _notifyListener(
    listener: MessageBusListener<string, unknown>,
    message: MessageBusMessage<string, unknown>,
  ): void;

  private _throttledWriteToExternal(message: { type: string; data: unknown }): void {
    this._throttleBuffer.push(message);
    if (this._throttleTimerId) {
      return;
    }

    this._waitUntil(
      new Promise<void>((resolve) => {
        this._throttleTimerId = setTimeout(() => {
          this.flushToExternal();
          resolve();
        }, this._throttleDelay);
      }),
    );
  }

  flushToExternal(): void {
    // No sense calling this._writeToExternal() with a false alarm,
    // that way they don't need to handle emptiness themselves.
    if (this._throttleBuffer.length === 0) {
      return;
    }

    if (this._options.debug) {
      console.log('MessageBus flushToExternal()');
    }

    this._writeToExternal(this._throttleBuffer);

    // It's possible this function will be called by someone else directly
    // in which case we need to cancel the timer if it's still running.
    if (this._throttleTimerId) {
      clearTimeout(this._throttleTimerId);
    }
    this._throttleBuffer = [];
    this._throttleTimerId = null;
  }

  /** Attach an event listener */
  on<T extends keyof MessageDataByType>(type: T, callback: MessageBusListener<T, MessageDataByType[T]>): this;
  on<T extends string, D = unknown>(
    type: T extends keyof MessageDataByType ? never : T,
    callback: MessageBusListener<T, D>,
  ): this;
  on(type: string, callback: MessageBusListener<any, any>): this {
    // If it doesn't already have a listener for this message type, add one.
    if (!this._listenersByMessageType.has(type)) {
      this._listenersByMessageType.set(type, new Set());
    }
    // Grab the Set of listeners for this message type
    const listeners = this._listenersByMessageType.get(type)!;
    listeners.add(callback);

    return this;
  }

  /** Remove an event listener */
  off<T extends keyof MessageDataByType>(type: T, callback: MessageBusListener<T, MessageDataByType[T]>): this;
  off<T extends string, D = unknown>(
    type: T extends keyof MessageDataByType ? never : T,
    callback: MessageBusListener<T, D>,
  ): this;
  off(type: string, callback: MessageBusListener<any, any>): this {
    const listeners = this._listenersByMessageType.get(type);
    if (!listeners) {
      return this;
    }
    listeners.delete(callback);

    return this;
  }

  /** Attach an event listener that will run only once */
  once<T extends keyof MessageDataByType>(type: T, callback: MessageBusListener<T, MessageDataByType[T]>): this;
  once<T extends string, D = unknown>(
    type: T extends keyof MessageDataByType ? never : T,
    callback: MessageBusListener<T, D>,
  ): this;
  once(type: string, callback: MessageBusListener<any, any>): this {
    const outerCallback: MessageBusListener<string, unknown> = (message) => {
      this.off(type, outerCallback);
      callback(message);
    };
    this.on(type, outerCallback);

    return this;
  }

  /** Emit an event (i.e. trigger, fire) */
  emit<T extends keyof MessageDataByType>(type: T, data: MessageDataByType[T]): this;
  emit<T extends string, D = unknown>(type: T extends keyof MessageDataByType ? never : T, data: D): this;
  emit<D>(type: string, data: D): this {
    if (this._options.debug) {
      console.log(`MessageBus emit('${type}',`, data, ')');
    }

    this._throttledWriteToExternal({ type, data });

    const listeners = this._listenersByMessageType.get(type);
    if (!listeners) {
      return this;
    }

    for (const listener of Array.from(listeners)) {
      const message = new MessageBusMessage(type, data);
      this._notifyListener(listener, message);
    }

    return this;
  }
}
