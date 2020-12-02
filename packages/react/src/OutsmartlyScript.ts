import * as React from 'react';
import { _outsmartly_dev_mode, _outsmartly_enabled } from './env';
import { getCurrentOverrides } from './overridesByPathname';

export function OutsmartlyScript() {
  if (_outsmartly_enabled && _outsmartly_dev_mode) {
    const config = getCurrentOverrides();
    if (config && !config.isLoading) {
      return React.createElement('script', {
        id: '__OUTSMARTLY_DATA__',
        type: 'application/json',
        dangerouslySetInnerHTML: {
          __html: JSON.stringify(config.data),
        },
      });
    }
    // Do not early return! The empty script tag is needed
    // when not in dev mode.
  }

  return React.createElement('script', {
    id: '__OUTSMARTLY_DATA__',
    type: 'application/json',
  });
}
