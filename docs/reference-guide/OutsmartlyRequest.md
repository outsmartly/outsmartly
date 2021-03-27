# OutsmartlyRequest

```ts
type OutsmartlyRequestInfo = OutsmartlyRequest | string;

interface OutsmartlyRequestInitOutsmartlyProperties {
  id: string;
  params: RouteParams;
}

interface OutsmartlyRequestInit extends RequestInit {
  outsmartly: OutsmartlyRequestInitOutsmartlyProperties;
}

interface OutsmartlyRequest extends Request {
  outsmartly: OutsmartlyRequestInitOutsmartlyProperties;
  constructor(input: OutsmartlyRequest);
  constructor(input: string, init: OutsmartlyRequestInit);
  clone(): OutsmartlyRequest;
}
```
