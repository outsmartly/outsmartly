# Interceptors

Interceptors are used whenever you want to intercept a request at the CDN edge, before it would otherwise go to your origin server.

You can use them to make API serverless endpoints at the edge, proxy requests to different origins (like images services, analytics, etc.), redirects, authentication, and more. Since interceptors run at the CDN edge, closer to your users, they can be used as a more performant replacement for many things you would have otherwise hit your origin for.

Like other parts of your config, interceptors run inside a JavaScript environment in Outsmartly's CDN edge. It uses the standardized web APIs, such as [`Request`](https://developer.mozilla.org/en-US/docs/Web/API/Request), [`Response`](https://developer.mozilla.org/en-US/docs/Web/API/Response), and others; it does not have a DOM and is not a Node.js runtime. This is part of the reason \(among many\) that Outsmartly is able to offer the performance it does.

The signature of an interceptor is a function which accepts one argument: an [`OutsmartlyInterceptEvent`](reference-guide/OutsmartlyInterceptEvent.md). The `OutsmartlyInterceptEvent` contains additional information such as the [`OutsmartlyRequest`](reference-guide/outsmartlyrequest.md) object, [`OutsmartlyEdgeVisitor`](reference-guide/OutsmartlyEdgeVisitor.md), helpers for cookies, and more.

```typescript
function intercept?(event: OutsmartlyInterceptEvent): PromiseOrValue<Response>;

type PromiseOrValue<T> = Promise<T> | T;
```

The simplest interceptor that makes a different request to a different URL looks like this:

```javascript
function intercept(event) {
  return fetch('https://api.github.com/users/outsmartly');
}
```

A more complex example might be proxying the entire request to GitHub instead:

```javascript
async function intercept(event) {
  const url = new URL(event.url);
  // This will change only the host, not the pathname/search/port
  url.host = 'api.github.com';
  const request = new Request(url, event.request);
  return await fetch(request);
}
```

Once you have an interceptor function, you can add it to a route object in you [outsmartly.config.js](reference-guide/outsmartly.config.js.md):

Here we take the GitHub proxy example a step further, by putting it on a route at `/github-proxy/` and we use the `*` asterisk to signal we want to match anything that comes after it, including slashes. We can then get access to the value at `event.request.outsmartly.params[0]`.

{% hint style="info" %}
Outsmartly's path matching syntax follows the same behavior as Express v4, so you can easily test patterns using their helpful online tool: [http://forbeslindesay.github.io/express-route-tester/](http://forbeslindesay.github.io/express-route-tester/)

While this syntax is popular, tried and true, some do not realize that named route params are not greedy; they do not match anything past the next slash. So if you had used `/github-proxy/:path` instead, and made a request to `/github-proxy/users/outsmartly`, `:path` would not have matched. If you used `:path*`, with an asterisk, it would match the request, but `:path` only captures `users` it would not have captured `/outsmartly`.
{% endhint %}

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
      // Instead of defining this as 'function intercept(event)' we're
      // utilizing JavaScript shorthand object methods. Either approach works.
      path: '/github-proxy/*',
      async intercept(event) {
        const proxiedPath = event.request.outsmartly.params[0];
        const url = new URL(event.url);

        url.host = 'api.github.com';
        url.pathname = proxiedPath; // excludes the base path now

        const request = new Request(url, event.request);

        return await fetch(request);
      },
    },
  ],
};
```

## Serverless API Endpoints

Interceptors can be used as a way to have serverless API endpoints, closer to your users and also being able to take advantage of the extra features of Outsmartly.

Even if you have to make requests to external databases, it can still be faster than going back to your origin because traffic from the edge to the database is routed more closely through Internet exchange points.

Here's a pseudo-code example where we call `someHowQueryDatabaseForUser(userId)` to query our database, then format the result as a JSON response.

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
      path: '/users/:userId',
      async intercept(event) {
        const { userId } = event.request.outsmartly.params;
        const user = await someHowQueryDatabaseForUser(userId);
        const body = JSON.stringify(user, null, 2);

        return new Response(body, {
          headers: {
            'content-type': 'application/json',
          },
        });
      },
    },
  ],
};
```

{% hint style="info" %}
If you do make external requests from your interceptor, keep in mind the geographic location of the destination will impact the API response times. When possible, try to utilize various forms of caching.
{% endhint %}

