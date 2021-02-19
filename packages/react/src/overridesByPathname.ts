import { _outsmartly_dev_mode, _outsmartly_enabled } from './env';
import {
  getOutsmartlyScriptData,
  OutsmartlyScriptData,
  LogMessage,
} from './getOverrideResults';

type PageOverrides =
  | {
      isLoading: false;
      pathname: string;
      data?: OutsmartlyScriptData;
    }
  | {
      isLoading: true;
      pathname: string;
      suspensePromise: Promise<void>;
    };

let hasRehydrated = typeof window !== 'object';
let currentPathname = typeof location === 'object' ? location.pathname : '';
let currentHost: string | undefined;

export const overridesByPathname: {
  [key: string]: PageOverrides;
} = Object.create(null);

export function getOverridesByPathname(
  pathname: string,
): PageOverrides | undefined {
  if (!_outsmartly_enabled) {
    return;
  }

  if (!hasRehydrated) {
    throw new Error(
      'Outsmartly has not been initialized client-side. rehydrateOverridesForPathname(location.pathname) must be called before any attempt to render.',
    );
  }
  return overridesByPathname[pathname];
}

export function getCurrentOverrides() {
  return getOverridesByPathname(currentPathname);
}

function reportLogs(logs: LogMessage[], pathname: string): void {
  if (!logs || logs.length === 0) {
    return;
  }

  console.group(
    `%c(${logs.length}) Outsmartly Edge logs for path ${pathname}`,
    'font-size: 12px; font-weight: normal;',
  );
  for (const message of logs) {
    const { type = 'log', originator, args = [], title = '' } = message;
    const post = originator ? ` ${originator.toUpperCase()}` : '';
    const pre = `%c[Outsmartly${post}] ${title}:`;

    switch (type) {
      case 'log': {
        console.log(pre, 'margin-left: 10px; color: #999;', ...args);
        break;
      }

      case 'warn': {
        console.warn(pre, 'color: #999;', ...args);
        break;
      }

      case 'error': {
        console.error(pre, 'color: #999;', ...args);
        break;
      }

      default:
    }
  }
  console.groupEnd();
}

export function setCurrentPathname(pathname: string): void {
  currentPathname = pathname;
}

function setOverridesForPathname(data: OutsmartlyScriptData, pathname: string) {
  if (!data.host) {
    data.host = currentHost;
  }

  overridesByPathname[pathname] = {
    pathname,
    data,
    isLoading: false,
  };

  try {
    reportLogs(data.logs, pathname);
  } catch (e) {
    console.error(e);
  }
}

export function rehydrateOverridesForPathname(pathname: string): void {
  hasRehydrated = true;
  setCurrentPathname(pathname);
  const outsmartlyScriptData = getOutsmartlyScriptData();

  if (!outsmartlyScriptData) {
    return;
  }

  // This might be undefined (e.g. when not in dev mode),
  // but it's still safe to set it anyway.
  currentHost = outsmartlyScriptData.host;

  setOverridesForPathname(outsmartlyScriptData, pathname);
  return;
}

export interface OverrideLoadOptions {
  cache?: boolean;
  host?: string;
}

export function loadOverridesForPathname(
  pathname: string,
  options: OverrideLoadOptions,
): Promise<void> {
  return preloadOverridesForPathname(pathname, options);
}

export function preloadOverridesForPathname(
  pathname: string,
  { cache = false, host }: OverrideLoadOptions,
): Promise<void> {
  if (!_outsmartly_enabled) {
    return Promise.resolve();
  }

  if (host) {
    currentHost = host;
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
    try {
      const endpoint = `/__outsmartly__/overrides?route=${encodeURIComponent(
        pathname,
      )}`;
      const resp = await fetch(currentHost ? currentHost + endpoint : endpoint);
      const data: OutsmartlyScriptData = await resp.json();

      setOverridesForPathname(data, pathname);
      resolve();
    } catch (e) {
      console.error(e);
      overridesByPathname[pathname] = {
        pathname,
        isLoading: false,
      };
      reject(e);
    }
  });

  overridesByPathname[pathname] = {
    pathname,
    suspensePromise,
    isLoading: true,
  };

  return suspensePromise;
}
