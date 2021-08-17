# Plugins

Plugins are used to encapsulate and abstract away adding functionality to your Outsmartly edge. They'll often include things like middleware, interceptors, and overrides.

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

#### [Type Definition](../../packages/core/src/public/types.ts#:~:text=interface%20Plugin)

### Example

```typescript
export function myCustomPlugin(options) {
  return {
    name: '@yourcompany/outsmartly-plugin-does-something',
    setup({ config, messageBus }) {
      // Listening for messages, globally
      messageBus.on('Something.HAPPENED', async (event) => {
        const { message } = event;
        // do something with it, such as call fetch()
      });

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
    },
  };
}
```
