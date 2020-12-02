import {
  _outsmartly_enabled,
  onPathnameChange,
  loadOverridesForPathname,
} from '@outsmartly/react';

export default async function initClient({ router }) {
  if (!_outsmartly_enabled) {
    return;
  }

  const pageLoaderPrototype = router.pageLoader.constructor.prototype;
  const { prefetch, loadPage } = pageLoaderPrototype;

  pageLoaderPrototype.prefetch = async function (pathname, priority) {
    try {
      if (!priority) {
        await loadOverridesForPathname(pathname);
      }
    } catch (e) {
      console.error(e);
    }

    return prefetch.apply(this, arguments);
  };

  pageLoaderPrototype.loadPage = async function (pathname) {
    try {
      await loadOverridesForPathname(pathname);
    } catch (e) {
      console.error(e);
    }

    return loadPage.apply(this, arguments);
  };

  router.events.on('routeChangeStart', (pathname) => {
    onPathnameChange(pathname);
  });
}
