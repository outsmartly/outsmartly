# outsmartly.config.js

## Example

```typescript
export default {
  name: 'my-example-website',
  environments: [
    {
      name: 'production',
      origin: 'https://my-example-website.vercel.app',
    },
  ],
  routes: [
    {
      path: '/products/:productName',
      overrides: [
        {
          component: 'TopBanner',
          async getOverrideProps(event) {
            event.log('hello, from the override!');
            // This example is using the :productName param we
            // defined in our route path.
            const { params } = event.request.outsmartly;
            const message = await fetch(`https://my-cms.com/banners/${params.productName}`);

            return {
              props: {
                message,
              },
            };
          },
        },
      ],
    },
  ],
};
```

## Type Definition

```typescript
interface OutsmartlyConfig {
  /**
   * The project name, for example, 'my-example-website'
   */
  name: string;

  /**
   * The possible deployment environments.
   * @see Environment
   */
  environments: Array<{
    /**
     * Currently, only `name: 'production'` is supported.
     */
    name: 'production';

    /**
     * Your origin is where Outsmartly's CDN proxies requests to.
     * Here are some examples:
     *
     *   https://my-site.vercel.app
     *   https://my-site.netlify.app
     *   http://my-site.s3-website.us-east-2.amazonaws.com
     *
     * It's important to note that it DOES include the protocol/scheme,
     * such as `https://` but it does NOT include any path.
     */
    origin: string;
  }>;

  /**
   * Optional middleware that runs before any of your route handlers.
   */
  middleware?: Middleware[];

  /**
   * Optional routes to apply overrides, interceptors, or middleware.
   * They are applied in the order they are provided.
   */
  routes?: Array<{
    /**
     * A pattern to match a given path. You can use an Express-style format,
     * where colons are used for parameters `/products/:productId` and an asterisk
     * can be used as a wildcard match `/blog/*\/comments`.
     *
     * Matched parameters are available on:
     *   event.request.outsmartly.params
     *
     * @see OutsmartlyEvent
     */
    path: string | RegExp;

    /**
     * Optional middleware that runs after any top-level middleware, but before
     * your overrides start. They are applied in the order they are provided.
     */
    middleware?: Middleware[];

    /**
     * Optional lifecyle method to intercept a request that otherwise would have
     * gone to your origin.
     *
     * Useful for implementing custom API's at the CDN edge, proxying to different
     * origins (like image services, analytics, etc.), redirects, authentication, etc.
     *
     * Interceptors are quite powerful, and can be used as a more performant replacement
     * for things you would otherwise hit your origin for.
     */
    intercept?(event: OutsmartlyInterceptEvent): PromiseOrValue<Response>;

    overrides?: Array<{
      /**
       * A human-readable name to describe this override. While optional, this
       * will be added to any errors or event.log()'s that are sent from your
       * overrides. If not provided, the component name will be used instead.
       */
      name?: string;

      /**
       * The name of the component you wish to override. If there is more than
       * one instance of this component on the page, getOverrideProps() will be
       * called once for each one of them, giving you the ability to customize
       * the overrides for them individually.
       */
      component: string;

      /**
       * The lifecycle function where you compute and return the props you wish to
       * override.
       */
      getOverrideProps(event: OutsmartlyOverrideEvent): PromiseOrValue<{ props: object }>;
    }>;
  }>;
}
```
