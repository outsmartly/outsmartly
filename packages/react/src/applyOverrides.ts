import { SafePropsValue, _outsmartly_dev_mode } from './env';
import { getCurrentOverrides } from './overridesByPathname';
import { mergeObjects } from './mergeObjects';

export function applyOverrides(
  args: SafePropsValue[],
  scope: string,
): SafePropsValue[] {
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

  const override = config.data?.overrides[scope];
  if (!override) {
    return args;
  }

  const overriddenProps = JSON.parse(override).props as SafePropsValue;
  // When override React component's we only care about the
  // first argument, the props. The babel output is still an
  // array for future-proofing.
  mergeObjects(overriddenProps, args[0]);

  return [overriddenProps];
}
