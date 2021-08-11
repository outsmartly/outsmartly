import { useEffect } from 'react';
import { Router, useRouter } from 'next/router';
import {
  _outsmartly_enabled,
  _outsmartly_two_promises_settled,
  setCurrentPathname,
  preloadOverridesForPathname,
  loadOverridesForPathname,
} from '@outsmartly/react';

let isActivelyRouting = false;
let hasBoundEventHandlers = false;

// The Router must be patched before any initialization takes place.
if (_outsmartly_enabled) {
  const { prefetch: originalPrefetch, getRouteInfo: originalGetRouteInfo } = Router.prototype;

  Router.prototype.prefetch = async function (...args): Promise<void> {
    const [pathname] = args;
    const [outsmartly, next] = await _outsmartly_two_promises_settled(
      preloadOverridesForPathname(pathname, { cache: true }),
      originalPrefetch.apply(this, args),
    );

    if (outsmartly.status === 'rejected') {
      console.error(outsmartly.reason);
    }

    if (next.status === 'rejected') {
      throw next.reason;
    }

    await next.value;
  };

  // This actually should return Promise<PrivateRouteInfo> but PrivateRouteInfo is
  // inaccessible from our code. This is not a documented public API so it's not
  // intended to be monkeypatched like this.
  Router.prototype.getRouteInfo = async function (...args): Promise<any> {
    const [_route, _pathname, _query, as] = args;
    if (!isActivelyRouting) {
      console.error('Outsmartly internal bug: page loading while not in routing state.');
      return originalGetRouteInfo.apply(this, args);
    }

    const [outsmartly, next] = await _outsmartly_two_promises_settled(
      // TODO(jayphelps): 'query' has the query params we should be adding
      // but it is an object so we need to convert it.
      loadOverridesForPathname(as, { cache: true }),
      originalGetRouteInfo.apply(this, args),
    );

    if (outsmartly.status === 'rejected') {
      console.error(outsmartly.reason);
    }

    if (next.status === 'rejected') {
      throw next.reason;
    }

    return next.value;
  };
}

export function usePatchedRouter() {
  if (!_outsmartly_enabled) {
    return;
  }

  const router = useRouter();

  useEffect(() => {
    function routeChangeStartHandler(pathname: string) {
      isActivelyRouting = true;
      setCurrentPathname(pathname);
    }

    function routeChangeCompleteHandler() {
      isActivelyRouting = false;
    }

    function routeChangeErrorHandler() {
      isActivelyRouting = false;
      // We change our internal "current path" before Next.js
      // changes the browser's so we need to set it back.
      setCurrentPathname(location.pathname);
    }

    if (!hasBoundEventHandlers) {
      router.events.on('routeChangeStart', routeChangeStartHandler);
      router.events.on('routeChangeComplete', routeChangeCompleteHandler);
      router.events.on('routeChangeError', routeChangeErrorHandler);
      hasBoundEventHandlers = true;
    }

    return () => {
      if (!hasBoundEventHandlers) {
        return;
      }

      router.events.off('routeChangeStart', routeChangeStartHandler);
      router.events.off('routeChangeComplete', routeChangeCompleteHandler);
      router.events.off('routeChangeError', routeChangeErrorHandler);
      hasBoundEventHandlers = false;
    };
  }, [router]);
}
