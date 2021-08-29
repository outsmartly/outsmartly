export interface SetCookieOptions {
  expires?: string;
  maxAge?: number;
  domain?: string;
  path?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

type CookieChange = { value: string; options: SetCookieOptions };

export class OutsmartlyReadonlyCookies extends Map<string, string> {
  constructor(entries: [string, string][] | string | null) {
    super();

    if (typeof entries === 'string') {
      parseCookiesIntoMap(entries, this);
      return;
    }

    // Cannot use super(entries) because it actually internally calls this.set()
    // and would throw our custom "immutable" error.
    if (Array.isArray(entries)) {
      for (const [key, value] of entries) {
        Map.prototype.set.call(this, key, value);
      }
    }
  }

  override toString(): string {
    const parts = [];

    for (const [key, value] of this) {
      parts.push(`${key}=${value}`);
    }

    return parts.join(';');
  }

  /**
   * @ignore
   */
  override set(key: string, value: string, options: SetCookieOptions = {}): this {
    throwImmutableCookiesError('set');
  }

  /**
   * @ignore
   */
  override delete(key: string): boolean {
    throwImmutableCookiesError('delete');
  }
}

export class OutsmartlyCookies extends OutsmartlyReadonlyCookies {
  private _changes = new Map<string, CookieChange>();

  public override set(key: string, value: string, options: SetCookieOptions = {}): this {
    this._changes.set(key, { value, options });
    // Can't use super.set() because it is the read-only version
    Map.prototype.set.call(this, key, value);
    return this;
  }

  override delete(key: string): boolean {
    const options: SetCookieOptions = {
      maxAge: -1,
    };
    this._changes.set(key, { value: '', options });
    // Can't use super.delete() because it is the read-only version
    return Map.prototype.delete.call(this, key);
  }
}

function parseCookiesIntoMap(input: string, map: Map<string, string>): void {
  if (input.trim() === '') {
    return;
  }

  const parts = input.split(';');

  for (let i = 0, l = parts.length; i < l; i++) {
    const [name, value] = parts[i].split('=');
    // Regular map.set() might throw if this is the immutable OutsmartlyReadonlyCookies
    Map.prototype.set.call(map, name.trim(), value);
  }
}

function throwImmutableCookiesError(methodName: string): never {
  throw new TypeError(
    `Failed to execute '${methodName}' on 'OutsmartlyReadonlyCookies': This instance of cookies is immutable.`,
  );
}
