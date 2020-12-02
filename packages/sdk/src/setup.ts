import { onPathnameChange } from './onPathnameChange';

if (typeof location !== 'undefined' && typeof location.pathname === 'string') {
  try {
    onPathnameChange(location.pathname);
  } catch (e) {
    console.error(e);
  }
}
