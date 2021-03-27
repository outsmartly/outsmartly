import {
  PageOverrides,
  state,
  _outsmartly_dev_mode,
  _outsmartly_enabled,
} from './env';
import {
  getOutsmartlyScriptData,
  OutsmartlyScriptData,
} from './getOverrideResults';
import * as console from './console';
import { reportEdgeLogs } from './reportEdgeLogs';

export function getOverridesByPathname(
  pathname: string,
): PageOverrides | undefined {
  if (!_outsmartly_enabled || !state.hasRehydrated) {
    return;
  }

  return state.overridesByPathname[pathname];
}

export function getCurrentOverrides() {
  return getOverridesByPathname(state.currentPathname);
}

export function setCurrentPathname(pathname: string): void {
  state.currentPathname = pathname;
}

function setOverridesForPathname(data: OutsmartlyScriptData, pathname: string) {
  state.overridesByPathname[pathname] = {
    pathname,
    data,
    isLoading: false,
  };

  reportEdgeLogs(data.logs, pathname);
}

// This is specifically for the expected format of the data inside <script id="__OUTSMARTLY_DATA__">.
// If this ever need to break in a backwards incompatible way, this allows us to at least tell the
// developer in the console the current SDK version is no longer supported.
const SCRIPT_DATA_FORMAT_VERSION = 1;

export function rehydrateOverridesForPathname(pathname: string): void {
  setCurrentPathname(pathname);
  const outsmartlyScriptData = getOutsmartlyScriptData();
  if (!outsmartlyScriptData) {
    return;
  }

  if (outsmartlyScriptData.minFormatVersion > SCRIPT_DATA_FORMAT_VERSION) {
    // We don't throw an error because, while we know this code isn't strictly compatible anymore,
    // it might still work "good enough" in some situations and if there are exceptions that get thrown
    // because of unexpected data format changes we should be catching them then recovering when we can.
    console.error(
      'This version of the @outsmartly/react SDK is no longer supported. Please update to the latest.',
    );
  }

  setOverridesForPathname(outsmartlyScriptData, pathname);
  // This allows the edge to change what endpoints are used for API calls, which allows us to direct it
  // to different servers if needed, and gives us flexibility for backwards compatibility purposes.
  Object.assign(state.endpoints, outsmartlyScriptData.endpoints);
  state.hasRehydrated = true;
  return;
}

export interface OverrideLoadOptions {
  cache?: boolean;
}

export function loadOverridesForPathname(
  pathname: string,
  options: OverrideLoadOptions,
): Promise<void> {
  return preloadOverridesForPathname(pathname, options);
}

export function preloadOverridesForPathname(
  pathname: string,
  { cache = false }: OverrideLoadOptions,
): Promise<void> {
  if (!_outsmartly_enabled) {
    return Promise.resolve();
  }

  if (cache) {
    const existing = getOverridesByPathname(pathname);
    if (existing) {
      // We don't want concurrent requests that creates a race condition
      // for which one updates last.
      if (existing.isLoading) {
        return existing.suspensePromise;
        // We don't currently update overrides once they've been visited.
      } else {
        return Promise.resolve();
      }
    }
  }

  const suspensePromise = new Promise<void>(async (resolve, reject) => {
    const endpoint = `${state.endpoints.overrides}?route=${encodeURIComponent(
      pathname,
    )}`;

    try {
      const resp = await fetch(endpoint);
      const data: OutsmartlyScriptData = await resp.json();

      setOverridesForPathname(data, pathname);
      resolve();
    } catch (e) {
      console.error(`Unable to fetch overrides for ${endpoint}`, e);
      state.overridesByPathname[pathname] = {
        pathname,
        isLoading: false,
      };
      reject(e);
    }
  });

  state.overridesByPathname[pathname] = {
    pathname,
    suspensePromise,
    isLoading: true,
  };

  return suspensePromise;
}
