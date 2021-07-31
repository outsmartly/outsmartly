import { MessageBus, MessageBusListener } from './MessageBus';
import { MessageBusMessage } from './MessageBusMessage';
import { MessageDataByType } from './MessageDataByType';
import { OutsmartlyEdgeMessageEvent } from './OutsmartlyEvent';

export type EdgeMessageBusListener<T extends string, D> = MessageBusListener<OutsmartlyEdgeMessageEvent<T, D>>;

export declare class EdgeMessageBus extends MessageBus {
  // Maintainers: for some reason TypeScript doesn't like it if we mark these methods
  // private or protected and then try and use this type with the real EdgeMessageBus
  // provided by Outsmartly. It's quite unfortunate as these will be auto-suggested.
  // TODO: figure out if this is a known bug, or some other non-obvious thing, as this
  // same pattern worked fine for ClientMessageBus, but it isn't a 'declare class'!

  /**
   * @private
   */
  override _writeToExternal(messages: MessageBusMessage<string, unknown>[]): Promise<void>;

  /**
   * @private
   */
  override _waitUntil(_promise: Promise<unknown> | void): void;

  /**
   * @private
   */
  override _notifyListener(
    listener: EdgeMessageBusListener<string, unknown>,
    message: MessageBusMessage<string, unknown>,
  ): void;
}

export interface EdgeMessageBus extends MessageBus {
  on<T extends keyof MessageDataByType>(type: T, callback: EdgeMessageBusListener<T, MessageDataByType[T]>): this;
  on<T extends string, D = unknown>(
    type: T extends keyof MessageDataByType ? never : T,
    callback: EdgeMessageBusListener<T, D>,
  ): this;
  on(type: string, callback: EdgeMessageBusListener<any, any>): this;

  off<T extends keyof MessageDataByType>(type: T, callback: EdgeMessageBusListener<T, MessageDataByType[T]>): this;
  off<T extends string, D = unknown>(
    type: T extends keyof MessageDataByType ? never : T,
    callback: EdgeMessageBusListener<T, D>,
  ): this;

  once<T extends keyof MessageDataByType>(type: T, callback: EdgeMessageBusListener<T, MessageDataByType[T]>): this;
  once<T extends string, D = unknown>(
    type: T extends keyof MessageDataByType ? never : T,
    callback: EdgeMessageBusListener<T, D>,
  ): this;

  emit<T extends keyof MessageDataByType>(type: T, data: MessageDataByType[T]): this;
  emit<T extends string, D = unknown>(type: T extends keyof MessageDataByType ? never : T, data: D): this;
}
