import * as console from './console';
// Initialization Client-side
import { rehydrateOverridesForPathname } from './overridesByPathname';

try {
  // TODO(jayphelps): ideally this is done by plugins e.g. our Next plugin.
  // Doing it inside on-init-client.js does NOT work, maybe alternatives?
  if (typeof location === 'object' && typeof location.pathname === 'string') {
    rehydrateOverridesForPathname(location.pathname + location.search);
  }
} catch (e) {
  // Defensive since this code runs immediately in the module, so it could
  // prevent other code from running that is more important.
  console.error(e);
}

// Public API
export {
  setCurrentPathname,
  rehydrateOverridesForPathname,
  preloadOverridesForPathname,
  loadOverridesForPathname,
} from './overridesByPathname';
export { OutsmartlyScript } from './OutsmartlyScript';

// Private API
export { _outsmartly_enabled } from './env';
export {
  _outsmartly_override,
  _outsmartly_mark_return,
  _outsmartly_mark_attr,
  _outsmartly_mark_child,
} from './babel-output-helpers';
