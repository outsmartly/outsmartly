# Plugins

Plugins are used to encapsulate abstract away adding functionality to your Outsmartly edge. They'll often include things like middleware, interceptors, and overrides.

Making your own plugins is possible, but more commonly you'll use one of the existing ones maintained by Outsmartly, or ones from the community:

## Common Plugins

- [@outsmartly/plugin-image-optimizations](https://www.npmjs.com/package/@outsmartly/plugin-image-optimizations)
- [@outsmartly/plugin-shopify](https://www.npmjs.com/package/@outsmartly/plugin-shopify)

## Usage

```typescript
import { somePlugin } from '@outsmartly/plugin-something';
export default {
  host: 'example.outsmartly.app',
  environments: [
    {
      name: 'production',
      origin: 'https://my-example-website.vercel.app',
    },
  ],
  plugins: [
    // Most plugins provide a factory function for passing in options:
    somePlugin({
      something: true,
    }),
  ],
};
```

## Making Your Own Plugins

Plugins are objects with a `name` and lifecycle methods.

```typescript
interface Plugin {
  /**
   * The name of your plugin, e.g. `@yourcompany/outsmartly-plugin-does-something'.
   * Used to improve logging and error messages.
   */
  name: string;

  /**
   * Optional lifecycle method called once, each time the edge worker is starting
   * up. Note that you cannot start any asynchronous operations during setup,
   * however, you can add middleware, interceptors, overrides, etc. to the
   * existing Outsmartly `config`.
   *
   * It accepts a single argument: an object containing the `config` derived
   * from the currently deployed outsmartly.config.js default export, as
   * well as the `messageBus`, which can be used to listen for or emit messages
   * that others can also listen for.
   */
  setup?(context: { config: SiteConfig; messageBus: MessageBus }): void;
}
```

### Example

```typescript
export function myCustomPlugin(options) {
  return {
    name: '@yourcompany/outsmartly-plugin-does-something',
    setup({ config, messageBus }) {
      // Adding custom middleware
      config.middleware.unshift(async (event, next) => {
        const response = await next();
        return response;
      });

      config.routes.push({
        path: '/something',
        async intercept(event) {
          return new Response('hello, world!');
        },
      });

      // Listening for messages, globally
      messageBus.on('Something.HAPPENED', async (message) => {
        // do something with it, such as call fetch()
      });
    },
  };
}
```
