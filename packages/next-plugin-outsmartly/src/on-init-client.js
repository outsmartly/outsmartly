import {
  _outsmartly_enabled,
  setCurrentPathname,
  rehydrateOverridesForPathname,
  preloadOverridesForPathname,
  loadOverridesForPathname,
} from '@outsmartly/react';

export default function initClient({ router }) {
  if (!_outsmartly_enabled) {
    return;
  }

  const routerPrototype = router.constructor.prototype;
  const pageLoaderPrototype = router.pageLoader.constructor.prototype;
  const { prefetch } = routerPrototype;
  const { loadPage } = pageLoaderPrototype;
  let isActivelyRouting = false;

  routerPrototype.prefetch = async function (pathname) {
    const [outsmartly, next] = await Promise.allSettled([
      preloadOverridesForPathname(pathname),
      prefetch.apply(this, arguments),
    ]);

    if (outsmartly.status === 'rejected') {
      console.error(outsmartly.reason);
    }

    if (next.status === 'rejected') {
      throw next.reason;
    }

    return next.value;
  };

  pageLoaderPrototype.loadPage = async function (pathname) {
    if (!isActivelyRouting) {
      console.error(
        'Outsmartly internal bug: page loading while not in routing state.',
      );
      return loadPage.apply(this, arguments);
    }

    const [outsmartly, next] = await Promise.allSettled([
      loadOverridesForPathname(pathname),
      loadPage.apply(this, arguments),
    ]);

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
