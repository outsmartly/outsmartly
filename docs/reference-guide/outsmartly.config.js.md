# outsmartly.config.js

## Example

```typescript
export default {
  host: 'my-example-website',
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

### [Type Definition](../../packages/core/src/public/types.ts#:~:text=interface%20OutsmartlyConfig)