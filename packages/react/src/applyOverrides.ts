import { OverrideResult, JSONValue, _outsmartly_dev_mode } from './env';
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
      if (_outsmartly_dev_mode) {
        console.warn(
          `[Outsmartly SDK] missing entry for component ${scope}. This is only expected when OUTSMARTLY_DEV=true mode is enabled and you're viewing your site without the Outsmartly Edge in front of it.`,
        );
      } else {
        console.error(
          `[Outsmartly SDK] missing entry for component ${scope}. Usually this means you're viewing the site without the Outsmartly Edge.`,
        );
      }
    }
    return args;
  }

  if (config.isLoading) {
    console.error(
      `[Outsmartly SDK] component ${scope} was rendered while its overrides were still loading.`,
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
