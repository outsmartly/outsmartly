import { JSONValue, _outsmartly_enabled } from './env';
import { applyOverrides } from './applyOverrides';

export function _outsmartly_override(args: JSONValue[], scope: string) {
  try {
    if (!_outsmartly_enabled) {
      return args;
    }

    return applyOverrides(args, scope);
  } catch (e) {
    if (e instanceof Promise) {
      throw e;
    }
    console.error(e);
    return args;
  }
}
