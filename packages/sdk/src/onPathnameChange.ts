import { OverridesByScope, _outsmartly_enabled } from './env';
import {
  getOutsmartlyScriptData,
  OutsmartlyScriptData,
  OverrideConsoleMessage,
} from './getOverrideResults';

const { hasOwnProperty } = Object.prototype;

function reportOverrideConsoleMessages(
  overrideConsoleMessages: OverrideConsoleMessage[],
): void {
  if (overrideConsoleMessages.length === 0) {
    return;
  }

  console.group(
    `%c(${overrideConsoleMessages.length}) Outsmartly Edge logs`,
    'font-size: 12px; font-weight: normal;',
  );
  for (const {
    type = 'log',
    originator = 'unknown',
    args = [],
    title = '<UNKNOWN>',
  } of overrideConsoleMessages) {
    const pre = `%c[${originator.toUpperCase()}] ${title}:`;

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

type PageOverrides =
  | {
      isLoading: false;
      pathname: string;
      overridesByScope: OverridesByScope;
    }
  | {
      isLoading: true;
      pathname: string;
      suspensePromise: Promise<void>;
    };

export const overridesByPathname: {
  [key: string]: PageOverrides;
} = Object.create(null);

function setOverridesForPathname(data: OutsmartlyScriptData, pathname: string) {
  overridesByPathname[pathname] = {
    pathname,
    overridesByScope: data.overrides,
    isLoading: false,
  };

  try {
    reportOverrideConsoleMessages(data.overrideConsoleMessages);
  } catch (e) {
    console.error(e);
  }
}

export let currentPathname = '/';
let firstPathnameChange = true;

export function onPathnameChange(pathname: string): Promise<void> {
  if (!_outsmartly_enabled) {
    return Promise.resolve();
  }

  currentPathname = pathname;

  if (firstPathnameChange) {
    firstPathnameChange = false;
    const outsmartlyScriptData = getOutsmartlyScriptData();

    if (!outsmartlyScriptData) {
      return Promise.resolve();
    }

    setOverridesForPathname(outsmartlyScriptData, pathname);
    return Promise.resolve();
  }

  return loadOverridesForPathname(pathname);
}

export function loadOverridesForPathname(pathname: string): Promise<void> {
  if (!_outsmartly_enabled) {
    return Promise.resolve();
  }

  // We don't currently update pages once they've been visited and are in memory
  if (hasOwnProperty.call(overridesByPathname, pathname)) {
    return Promise.resolve();
  }

  const suspensePromise = new Promise<void>(async (resolve, reject) => {
    try {
      const resp = await fetch(
        `/__outsmartly__/overrides?route=${encodeURIComponent(pathname)}`,
      );
      const data: OutsmartlyScriptData = await resp.json();

      setOverridesForPathname(data, pathname);
      resolve();
    } catch (e) {
      console.error(e);
      overridesByPathname[pathname] = {
        pathname,
        overridesByScope: {},
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
