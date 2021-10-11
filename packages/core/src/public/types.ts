import { EdgeMessageBus } from './EdgeMessageBus';
import { MessageBus } from './MessageBus';
import { OutsmartlyEdgeRequestEvent } from './OutsmartlyEvent';

type PromiseOrValue<T> = Promise<T> | T;

export type OutsmartlyRequestInfo = OutsmartlyRequest | Request | string;

export interface OutsmartlyRequestInitOutsmartlyProperties {
  id: string;
  params: {
    [key: string]: string;
  };
}

export interface OutsmartlyRequestInit extends RequestInit {
  outsmartly?: OutsmartlyRequestInitOutsmartlyProperties;
}

export declare class OutsmartlyRequest extends Request {
  outsmartly: OutsmartlyRequestInitOutsmartlyProperties;
  constructor(input: OutsmartlyRequest);
  constructor(input: string, init: OutsmartlyRequestInit);
  clone(): OutsmartlyRequest;
}

export interface OutsmartlyVisitor {
  /**
   * A unique, opaque, identifier for this particular visitor.
   * It is restored from an HttpOnly cookie, under the hood, so it
   * persists past sessions, but does not identify them cross-device.
   */
  id: string;
}

export interface OutsmartlyClientVisitor extends OutsmartlyVisitor {
  // Currently no additional fields
}

export interface OutsmartlyEdgeVisitor extends OutsmartlyVisitor {
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

  /**
   * Information about how likely this visitor is actually automated/scripted aka a bot.
   */
  bot: {
    /**
     * Whether or not the request is from a known, "good" bot.
     */
    verified: boolean;

    /**
     * A number between 0-100. The higher the score, the more likely it's an automated
     * request, with 100 meaning we are certain it is a bot and 0 meaning we do not know
     * at all.
     */
    score: number;
  };

  /**
   * Autonomous System Number of the incoming request, e.g. 123456.
   */
  asn: number;
}

export declare class OutsmartlyMiddlewareEvent extends OutsmartlyEdgeRequestEvent {
  override type: 'outsmartlymiddleware';
}

export declare class OutsmartlyInterceptEvent extends OutsmartlyEdgeRequestEvent {
  override type: 'outsmartlyintercept';
}

export declare class OutsmartlyOverrideEvent extends OutsmartlyEdgeRequestEvent {
  override type: 'outsmartlyoverride';

  getComponentArguments<R extends unknown[]>(): Promise<R>;
}

export interface Environment {
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
}

export interface Remote {
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
  default?: boolean;
  artifacts?: boolean;
}

export interface Middleware {
  (event: OutsmartlyMiddlewareEvent, next: (request?: Request) => PromiseOrValue<Response>): PromiseOrValue<Response>;
  displayName?: string;
}

type JSONPrimitive = string | number | boolean | null;
type JSONObject = { [member: string]: JSONValue };
type JSONArray = JSONValue[];
type JSONValue = JSONPrimitive | JSONObject | JSONArray;

export type OverrideReturnValue = {
  props: {
    [key: string]: JSONValue;
  };
} | void;

export interface Override {
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
  getOverrideProps(event: OutsmartlyOverrideEvent): PromiseOrValue<OverrideReturnValue>;
}

export interface Route {
  /**
   * A pattern to match a given path. You can use an Express-style format,
   * where colons are used for parameters `/products/:productId` and an asterisk
   * can be used as a wildcard match `/blog/*\/comments`.
   *
   * Matched parameters are available on:
   *   event.request.outsmartly.params
   *
   * @see OutsmartlyEdgeEvent
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

  overrides?: Override[];
}

export interface Plugin {
  /**
   * The name of your plugin, e.g. '@myapp/outsmartly-plugin-example'
   */
  name: string;

  /**
   * An optional lifecycle function that is called when the edge is initially
   * starting up.
   *
   * The OutsmartlyConfig provided has been normalized so that all top-level
   * fields are available even if they weren't originally provided.
   *
   * For example, `middleware` and `routes` will always be defined, even if
   * they weren't originally provided in the outsmartly.config.js used.
   *
   * Additionally, the now deprecated `environments` will be massaged into the
   * the new `remotes` format that replaces it.
   */
  setup?(context: { config: Omit<OutsmartlyConfig, 'environments'>; messageBus: EdgeMessageBus }): void;
}

export interface OutsmartlyConfig {
  /**
   * The Outsmartly-linked domain to deploy to, e.g. 'example.outsmartly.app'
   */
  host: string;

  /**
   * The possible deployment remotes.
   * @see Remote
   */
  remotes?: Remote[];

  /**
   * The possible deployment environments.
   * @deprecated in favor of remotes.
   * @see Environment
   */
  environments?: Environment[];

  /**
   * Optional plugins made for Outsmartly's edge
   */
  plugins?: Plugin[];

  /**
   * Optional middleware that runs before any of your route handlers.
   */
  middleware?: Middleware[];

  /**
   * Optional routes to apply overrides, interceptors, or middleware.
   * They are applied in the order they are provided.
   */
  routes?: Route[];
}
