# MessageBus

The MessageBus is used to send and receive messages in a decoupled way, both client-side and edge-side.

## Usage

### Client-side

Outsmartly provides a React Hook to gain access to the MessageBus from anywhere in your UI components:

```typescript
import { useMessageBus } from '@outsmartly/message-bus';

export function Home() {
  const messageBus = useMessageBus();
  const [clickCount, setClickCount] = useState(0);

  useEffect(() => {
    // Passing data as a second argument is optional
    messageBus.emit('YourCustomMessages.HOME_COMPONENT_MOUNTED');
  }, []);

  return (
    <button
      onClick={() => {
        setClickCount((clickCount) => {
          const newClickCount = clickCount + 1;
          const data = {
            count: newClickCount,
          };
          messageBus.emit('YourCustomMessages.BUTTON_CLICKED', data);

          return newClickCount;
        });
      }}
    >
      You have clicked me {clickCount} times
    </button>
  );
}
```

### Edge-side

At the edge, you can gain access to the MessageBus from any OutsmartlyEvent passed to middleware, interceptors, or overrides:

```typescript
export default {
  host: 'example.outsmartly.app',
  environments: [
    {
      name: 'production',
      origin: 'https://my-example-website.vercel.app',
    },
  ],
  // All routes will have this middleware applied
  middleware: [
    async function firstMiddleware(event, next) {
      event.messageBus.once('YourCustomMessages.COMPONENT_OVERRIDDEN', (message) => {
        event.log('Message received!', message);
      });
      return await next();
    },
  ],
  routes: [
    {
      path: '/some-base-path/*',
      overrides: [
        {
          component: 'ExampleComponent',
          async getOverrideProps(event) {
            const headline = 'hello, world';
            // Perhaps you want to notify some middleware that
            // something happened
            event.messageBus.emit('YourCustomMessages.COMPONENT_OVERRIDDEN', {
              headline,
            });

            return {
              props: {
                headline,
              },
            };
          },
        },
      ],
    },
  ],
};
```

When listening, it's more common to want to set up a global listener once, when the edge starts up. This can be done using the [plugin](../plugins.md) interface:

```typescript
export function myCustomPlugin(options) {
  return {
    name: '@yourcompany/outsmartly-plugin-does-something',
    setup({ config, messageBus }) {
      // Listening for messages, globally
      messageBus.on('YourCustomMessages.COMPONENT_OVERRIDDEN', async (message) => {
        // do something with it, such as call fetch()
      });
    },
  };
}
```

## Type Definition

```typescript
class MessageBus {
  constructor(options?: MessageBusOptions);

  /**
   * Listen for messages emitted. When listening at edge-side, the
   * listener is invoked for matching message types coming from both
   * the client-side *and* edge-side. When listening client-side, only
   * messages emitted client-side will be received. The direction of
   * messages is always client -> edge, never edge -> client.
   */
  on(type: string, callback: MessageBusListener<any, any>): this;

  /**
   * Stop listening for messages. Note that the callback passed in must be
   * the same function instance you originally passed to `on(type, callback)`
   */
  off(type: string, callback: MessageBusListener<any, any>): this;

  /** Attach an event listener that will run only once */
  once(type: string, callback: MessageBusListener<any, any>): this;

  /**
   * Emit an event (i.e. trigger, dispatch, fire) through the MessageBus
   * at the edge. Messages emitted client-side will re-emit at the edge,
   * but messages emitted edge-side will *not* re-emit client-side. The
   * direction of messages is always client -> edge, never edge -> client.
   */
  emit<T>(type: string, data: T): this;

  /**
   * Force the internal message buffer to flush. When called client-side
   * this will force the MessageBus to send all buffered messages to the
   * edge immediately. Edge-side this method currently does nothing,
   * however, eventually it will flush the buffer and immediately write
   * to a persisted database.
   */
  flushToExternal(): void;
}
```
