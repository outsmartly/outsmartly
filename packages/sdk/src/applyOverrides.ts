import { useState } from 'react';
import { OverrideResult, JSONValue } from './env';
import { currentPathname, overridesByPathname } from './onPathnameChange';
import { mergeOverrides } from './mergeOverrides';

interface OverrideListener {
  (override: OverrideResult): void;
}

const overrideListeners: OverrideListener[] = [];
export function onOverride(callback: OverrideListener): void {
  overrideListeners.push(callback);
}

function useForceUpdate() {
  try {
    return useState()[1] as () => void;
  } catch (e) {
    console.error(e);
    return () => {};
  }
}

export function applyOverrides(args: JSONValue[], scope: string): JSONValue[] {
  const config = overridesByPathname[currentPathname];
  if (!config) {
    return args;
  }

  // Only used to trigger a re-render
  const forceUpdate = useForceUpdate();

  if (config.isLoading) {
    // Intentionally not using async/await cause we can't and wouldn't want to.
    // We render with the default args, then force an update when the overrides
    // come in and then we can apply them. That does mean there's a flash of
    // without overrides -> with overrides but there's nothing we can do about it
    // if we don't have the data yet. Usually this means they're not doing prefetching
    // and/or not loading the data before rendering the new route.
    config.suspensePromise.then(() => forceUpdate());
    return args;
  }

  const result = config.overridesByScope[scope];
  if (!result) {
    return args;
  }

  // Devs can subscribe to know when overrides are applied for analytics.
  for (const callback of overrideListeners) {
    try {
      callback(result);
    } catch (e) {
      console.error(e);
    }
  }

  // When override React component's we only care about the
  // first argument, the props. The babel output is still an
  // array for future-proofing.
  const overriddenProps = mergeOverrides(args[0], result.props);
  return [overriddenProps] as JSONValue[];
}
