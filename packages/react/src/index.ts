// Public API
export {
  setCurrentPathname,
  rehydrateOverridesForPathname,
  preloadOverridesForPathname,
  loadOverridesForPathname,
} from './overridesByPathname';
export { OutsmartlyScript } from './OutsmartlyScript';

// Private API
export {
  _outsmartly_enabled,
  _outsmartly_emit_markers,
  _outsmartly_serialize_args,
} from './env';
export { _outsmartly_override } from './_outsmartly_override';

// Initialization Client-side
import { rehydrateOverridesForPathname } from './overridesByPathname';

// TODO(jayphelps): ideally this is done by plugins e.g. our Next plugin.
// Doing it inside on-init-client.js does NOT work.
if (typeof location === 'object' && typeof location.pathname === 'string') {
  rehydrateOverridesForPathname(location.pathname);
}

const root: any =
  typeof globalThis === 'object'
    ? globalThis
    : typeof self === 'object'
    ? self
    : typeof global === 'object'
    ? global
    : null;

if (root.__ORLY__) {
  throw new Error(
    'More than one copy of the Outsmartly SDK was loaded. Check your node_modules or npm/yarn why for duplicates.',
  );
}

root.__ORLY__ = {};
