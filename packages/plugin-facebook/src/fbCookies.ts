import { OutsmartlyCookies, OutsmartlyMiddlewareEvent } from '@outsmartly/core';

export const FBP_COOKIE_KEY: string = '_fbp';
export const FBC_COOKIE_KEY: string = '_fbc';

export function setupFbpFbc(event: OutsmartlyMiddlewareEvent) {
  verifyAndSetFbp(event.cookies);
  verifyAndSetFbc(event);
}

function verifyAndSetFbp(cookies: OutsmartlyCookies): void {
  if (!cookies.has(FBP_COOKIE_KEY)) {
    const fbpValue = createFbp();
    cookies.set(FBP_COOKIE_KEY, fbpValue, {
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 7 * 365,
    });
  }
}

function randomInteger(): number {
  return Math.floor(1000000000 + Math.random() * 9000000000);
}

function createFbp(): string {
  return `fb.1.${Date.now()}.${randomInteger()}`;
}

function verifyAndSetFbc(event: OutsmartlyMiddlewareEvent): void {
  const { cookies } = event;
  const fbclid = event.url.searchParams.get('fbclid');

  if (fbclid) {
    const fbc = createFbc(fbclid);
    cookies.set(FBC_COOKIE_KEY, fbc, {
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 7 * 365,
    });
  }
}

function createFbc(fbclid: unknown): string {
  return `fb.1.${Date.now()}.${fbclid}`;
}
