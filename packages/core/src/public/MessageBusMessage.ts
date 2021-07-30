/**
 * A message that can be sent to the Message Bus. A message can be an event
 * originating from the user (e.g. a click, a hover, or a page view), or it can
 * be something that occurs in server-side code. The term "message" is used
 * instead of "event" to distinguish these events from `OutsmartlyEvent` events.
 * */
export class MessageBusMessage<T extends string, D> {
  constructor(public type: T, public data: D) {}
}
