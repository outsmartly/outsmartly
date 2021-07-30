export interface OutsmartlyReadonlyCookies {
  has(key: string): boolean;
  get(key: string): string | undefined;

  /**
   * Returns an iterable of key, value pairs for every cookie entry.
   */
  entries(): IterableIterator<[string, string]>;

  /**
   * Returns an iterable of cookie keys.
   */
  keys(): IterableIterator<string>;

  /**
   * Returns an iterable of cookies values.
   */
  values(): IterableIterator<string>;

  /**
   * Returns an iterable of key, value pairs for every cookie entry.
   */
  [Symbol.iterator](): IterableIterator<[string, string]>;
}

export interface OutsmartlySetCookieOptions {
  expires?: string;
  maxAge?: number;
  domain?: string;
  path?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

export interface OutsmartlyCookies extends OutsmartlyReadonlyCookies {
  set(key: string, value: string, options?: OutsmartlySetCookieOptions): typeof value;
}