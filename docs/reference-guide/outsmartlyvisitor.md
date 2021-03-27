# OutsmartlyVisitor

```typescript
interface OutsmartlyVisitor {
  /**
   * A unique, opaque, identifier for this particular visitor.
   * It is restored from an HttpOnly cookie, under the hood, so it
   * persists past sessions, but does not identify them cross-device.
   */
  id: string;

  /**
   * Which category of device they are believed to be using, based on their User-Agent.
   * It is possible for this to be undefined, for example if no User-Agent is provided.
   */
  deviceType?: 'desktop' | 'mobile' | 'tablet';

  /**
   * The Internet Protocol address for the visitor.
   */
  ipAddress: string;

  /**
   * The "round-trip time", which is how long it takes for a single packet to be sent
   * and received. Sometimes referred to as "ping time."
   */
  clientTcpRtt: number;

  /**
   * The city near where the visitor is located, according to IP address records.
   * Accuracy can be affected by VPNs, proxies, and similar circumstances.
   * In some cases, no city can be determined.
   */
  city?: string;

  /**
   * The continent abbreviation where the visitor is located, e.g. "NA" for
   * North America. Accuracy can be affected by VPNs, proxies, and similar
   * circumstances. In some cases, no continent can be determined.
   */
  continent?: string;

  /**
   * The HTTP protocol the visitor's device used to connect, e.g. "HTTP/2".
   */
  httpProtocol: string;

  /**
   * The latitude of the visitor, according to IP address records, e.g. "37.7749".
   * This isn't their actual, precise location, but is can often be fairly accurate,
   * especially within the USA.
   */
  latitude?: string;

  /**
   * The longitude of the visitor, according to IP address records, e.g. "122.4194".
   * This isn't their actual, precise location, but is can often be fairly accurate,
   * especially within the USA.
   */
  longitude?: string;

  /**
   * The postal code of the visitor, e.g. "94016"
   */
  postalCode?: string;

  /**
   * The ISO 3166-2 name for the first level region associated with the visitor,
   * based on their IP address. In the USA, this is the state e.g. "California".
   */
  region?: string;

  /**
   * The ISO 3166-2 abbreviated name for the first level region associated with the visitor,
   * based on their IP address. e.g. The state of California would be "CA".
   */
  regionCode?: string;

  /**
   * The tz/IANA time zone database timezone of the visitor, e.g. "America/Los_Angeles".
   */
  timezone?: string;

  /**
   * The two letter country abbreviation of the visitor, e.g. "US"
   */
  country: string;
}
```

