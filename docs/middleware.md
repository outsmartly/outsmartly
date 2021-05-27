# Middleware

Middleware is used to alter the behavior of a request both before and after Outsmartly makes the request to your origin server and applies any overrides, if applicable.

The signature of a middleware is a function which accepts two arguments: an [`OutsmartlyEvent`](reference-guide/outsmartlyevent.md) and a `next()` function. The `OutsmartlyEvent` contains additional information such as the [`OutsmartlyRequest`](reference-guide/outsmartlyrequest.md) object, [`OutsmartlyVisitor`](reference-guide/outsmartlyvisitor.md), helpers for cookies, and more.

Middleware should call `next()` whenever they want to continue on to the "next" middleware, or if it's the last middleware, continue to the default, built-in functionality of Outsmartly.

```typescript
type Middleware = (
  event: OutsmartlyMiddlewareEvent,
  next: (request?: Request) => Promise<Response>,
) => PromiseOrValue<Response>;

type PromiseOrValue<T> = Promise<T> | T;
```

{% hint style="info" %}
It's a good practice to give your middleware functions names so that if there are any errors inside them, the error message seen in the browser response will contain the name of the middleware, to aid in debugging.
{% endhint %}

This pattern gives you the most flexibility: you can do things before, and after the default behavior. Not only that, you can also pass a different `Request` object when you call `next(request)` which then changes what request will actually be made.

The simplest middleware that does nothing \(no-op\) looks like this:

```javascript
function exampleMiddleware(event, next) {
  return next();
}
```

Middleware can be provided in you [outsmartly.config.js](reference-guide/outsmartly.config.js.md) in two places: at the top-level \(applying all routes\) or alternatively in a route itself \(applying only paths that match.\)

```javascript
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
    function firstMiddleware(event, next) {
      return next();
    },
  ],
  routes: [
    {
      // Any paths that start with /some-base-path/ will have
      // this middleware applied.
      path: '/some-base-path/*',
      middleware: [
        function secondMiddleware(event, next) {
          return next();
        },
      ],
    },
  ],
};
```

But that's not a very exciting piece of middleware. So let's see how we might add headers both to the request AND the response:

```javascript
async function authorizationRedirectMiddleware(event, next) {
  // The request objects are not directly mutable, so we have to create our
  // own copy, using the existing headers and request as a base.
  const headers = new Headers(event.request.headers);
  headers.set('My-Custom-Request-Header', 'something');
  const request = new Request(event.request, {
    headers,
  });

  // Move on to the next middleware, or built-in behavior. When this promise
  // resolves, we have already received the initial response from the origin
  // server (or the cache.)
  const response = await next();
  response.headers.set('A-Different-Response-Header', 'another-thing');

  // If you wanted to, you could even return a totally different response.
  return response;
}
```

You don't HAVE to call `next()`, but if you don't, remember that then Outsmartly will not make any requests to your origin or apply overrides to any HTML.

## Examples

### Set a cookie

Sometimes you want to set a cookie from the edge/server so that it can be an [httpOnly](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies#restrict_access_to_cookies) cookie, which makes it inaccessible from client-side JavaScript in the browser \(better security\) and also is much more likely to survive longer without the browser or extensions deleting it.

Often this is inside an interceptor, but if you need to do this from middleware, it is also possible. Here's an example where we set a cookie the first time you land on a product page, so we can later tell to do things like personalization/recommendations.

```javascript
export default {
  host: 'example.outsmartly.app',
  environments: [
    {
      name: 'production',
      origin: 'https://my-example-website.vercel.app',
    },
  ],
  routes: [
    {
      path: '/products/:productName',
      middleware: [
        async function landPageProductNameMiddleware(event, next) {
          if (!event.cookies.has('myapp-landingPageProductName')) {
            // Get the product name so we can track which
            const { productName } = event.request.outsmartly.params;
            event.cookies.set('myapp-landingPageProductName', productName, {
              httpOnly: true,
              path: '/',
              // Expires in a year
              maxAge: 60 * 60 * 24 * 7 * 52,
            });
          }

          // Otherwise, defer to the default behavior.
          // It's important to call this if you don't need to redirect!
          return await next();
        },
      ],
    },
  ],
};
```

### Redirects

In this example, for request paths that start with `/app/` we check if they are authorized, and if not, we redirect them to the `/login` page.

This demonstrates the using the request's path from [`event.url.pathname`](reference-guide/outsmartlyevent.md), along with getting a cookie named `'session'` by using the [`event.cookies`](reference-guide/outsmartlycookies.md) utility.

```javascript
function isAuthorized(sessionCookieValue) {
  // Somehow decide whether or not they are authorized.
  // e.g. using JSON Web Tokens
  return false;
}

export default {
  host: 'example.outsmartly.app',
  environments: [
    {
      name: 'production',
      origin: 'https://my-example-website.vercel.app',
    },
  ],
  routes: [
    {
      path: '/app/*',
      middleware: [
        async function authorizationRedirectMiddleware(event, next) {
          // Redirects work by providing a status and a Location header
          // to where you want to redirect the browser. No body is needed,
          // which is why we pass null.
          if (!isAuthorized(event.cookies.get('myapp-session'))) {
            return new Response(null, {
              status: 302,
              headers: {
                Location: '/login',
              },
            });
          }

          // Otherwise, defer to the default behavior.
          // It's important to call this if you don't need to redirect!
          return await next();
        },
      ],
    },
  ],
};
```

