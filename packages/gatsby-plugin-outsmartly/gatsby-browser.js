const {
  setCurrentPathname,
  loadOverridesForPathname,
  preloadOverridesForPathname,
} = require('@outsmartly/react');

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

exports.onClientEntry = (_, pluginOptions) => {
  // This isn't well documented, but it is still specifically mentioned here:
  //   https://www.gatsbyjs.com/docs/how-to/testing/unit-testing/
  // and referred to as the "publicLoader" here:
  //   https://github.com/gatsbyjs/gatsby/blob/bfd8c8c41db5fea654a9b84c54bbf63db0ce3a54/packages/gatsby/cache-dir/loader.js#L506
  // so we're going to hook into it so we can be sure a given page's overrides have in fact
  // been loaded before we transition to a given page.
  const loadPage = window.___loader?.loadPage;
  if (typeof loadPage !== 'function') {
    console.error(
      '@outsmartly/gatsby-plugin-outsmartly was unable to initialize. This is unexpected, and should be reported.\n\n  https://github.com/outsmartly/outsmartly/issues/new',
    );
    return;
  }

  window.___loader.loadPage = async (rawPath, ...rest) => {
    // TODO: does rawPath contain the location.search query?
    const [result] = await twoPromisesSettled(
      loadPage(rawPath, ...rest),
      loadOverridesForPathname(rawPath, { cache: true }),
    );

    return result.value;
  };
};

exports.onPrefetchPathname = ({ pathname }) => {
  // TODO: does pathname contain the location.search query?
  preloadOverridesForPathname(pathname, { cache: true });
};

exports.onPreRouteUpdate = ({ location, prevLocation }) => {
  if (prevLocation) {
    setCurrentPathname(prevLocation.pathname + prevLocation.search);
  } else {
    setCurrentPathname(location.pathname + location.search);
  }
};
