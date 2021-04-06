import {
  _outsmartly_enabled,
  setCurrentPathname,
  rehydrateOverridesForPathname,
  preloadOverridesForPathname,
  loadOverridesForPathname,
} from '@outsmartly/react';

// Instead of relying on Promise.allSettled() or even Promise.all() we make a simple
// one-off helper. Saves on bundle size since we don't need full spec compliance.
function twoPromisesSettled(a, b) {
  return new Promise((resolve) => {
    const results = [];
    const checkIfDone = () => {
      if (results.length === 2) {
        resolve(results);
      }
    };
    const wait = (promise) => {
      return promise
        .then(
          (value) => results.push({ status: 'fulfilled', value }),
          (reason) => results.push({ status: 'rejected', reason }),
        )
        .then(checkIfDone);
    };

    wait(a);
    wait(b);
  });
}

export default function initClient({ router }) {
  if (!_outsmartly_enabled) {
    return;
  }

  const routerPrototype = router.constructor.prototype;
  const { prefetch, getRouteInfo } = routerPrototype;
  let isActivelyRouting = false;

  routerPrototype.prefetch = async function (pathname) {
    const [outsmartly, next] = await twoPromisesSettled(
      preloadOverridesForPathname(pathname, { cache: true }),
      prefetch.apply(this, arguments),
    );

    if (outsmartly.status === 'rejected') {
      console.error(outsmartly.reason);
    }

    if (next.status === 'rejected') {
      throw next.reason;
    }

    return next.value;
  };

  routerPrototype.getRouteInfo = async function (route, pathname, query, as) {
    if (!isActivelyRouting) {
      console.error(
        'Outsmartly internal bug: page loading while not in routing state.',
      );
      return getRouteInfo.apply(this, arguments);
    }

    const [outsmartly, next] = await twoPromisesSettled(
      // TODO(jayphelps): 'query' has the query params we should be adding
      // but it is an object so we need to convert it.
      loadOverridesForPathname(as, { cache: true }),
      getRouteInfo.apply(this, arguments),
    );

    if (outsmartly.status === 'rejected') {
      console.error(outsmartly.reason);
    }

    if (next.status === 'rejected') {
      throw next.reason;
    }

    return next.value;
  };

  router.events.on('routeChangeStart', (pathname) => {
    isActivelyRouting = true;
    setCurrentPathname(pathname);
  });

  router.events.on('routeChangeComplete', (err, pathname) => {
    isActivelyRouting = false;
  });

  router.events.on('routeChangeError', (e, pathname) => {
    isActivelyRouting = false;
    // We change our internal "current path" before Next.js
    // changes the browser's so we need to set it back.
    setCurrentPathname(location.pathname);
  });
}
