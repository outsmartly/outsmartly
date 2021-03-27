# OutsmartlyEvent

The base event for all Outsmartly events; middleware, interceptors, and overrides.

```ts
interface OutsmartlyEvent extends Event {
  request: OutsmartlyRequest;
  url: URL;
  visitor: OutsmartlyVisitor;
  cookies: OutsmartlyCookies;
  state: { [key: string]: unknown };

  waitUntil(promise: Promise<unknown>): void;
  log(...args: any[]): void;
  warn(...args: any[]): void;
  error(...args: any[]): void;
}
```
