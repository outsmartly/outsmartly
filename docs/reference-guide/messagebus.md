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

#### [Type Definition](../../packages/core/src/public/MessageBus.ts#:~:text=class%20MessageBus)
