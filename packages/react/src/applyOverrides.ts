import { useState } from 'react';
import { OverrideResult, JSONValue } from './env';
import { getCurrentOverrides } from './overridesByPathname';
import { mergeOverrides } from './mergeOverrides';

interface OverrideListener {
  (override: OverrideResult): void;
}

const overrideListeners: OverrideListener[] = [];
export function onOverride(callback: OverrideListener): void {
  overrideListeners.push(callback);
}

export function applyOverrides(args: JSONValue[], scope: string): JSONValue[] {
  const config = getCurrentOverrides();
  if (!config) {
    if (typeof window === 'object') {
      console.error(
        `Outsmartly: component ${scope} was rendered without an entry client-side from Outsmartly.`,
      );
    }
    return args;
  }

  if (config.isLoading) {
    console.error(
      `Outsmartly: component ${scope} was rendered while its overrides were still loading.`,
    );
    return args;
  }

  const result = config.data?.overrides[scope];
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
