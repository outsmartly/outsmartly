import React, { ReactNode } from 'react';
import { htmlSafeJSONStringify } from './htmlSafeJSONStringify';

export const _outsmartly_dev_mode =
  !!process.env.OUTSMARTLY_DEV || !!process.env.NEXT_PUBLIC_OUTSMARTLY_DEV;

// Regarding NEXT_PUBLIC_OUTSMARTLY_DEV:
// AFAIK there is no way in Next to send process.env variables to
// the *browser* bundle without prefixing it. While understandable,
// not having any way to do it at all means we have to special case.
export const _outsmartly_enabled =
  process.env.NODE_ENV === 'production' || _outsmartly_dev_mode;

export const _outsmartly_emit_markers =
  _outsmartly_enabled && (typeof window !== 'object' || _outsmartly_dev_mode);

// TODO(jayphelps): I think this is how we'll do it when we have a
// local dev mode that doesn't require a tunnel.
/* export const _outsmartly_emit_markers =
  (_outsmartly_enabled &&
    typeof window !== 'object' &&
    !_outsmartly_dev_mode) ||
  null; */

export function _outsmartly_serialize_args(
  scope: string,
  args: unknown[],
): ReactNode {
  if (!_outsmartly_emit_markers) {
    return null;
  }

  return React.createElement('script', {
    type: 'application/json',
    'data-outsmartly-component': scope,
    dangerouslySetInnerHTML: {
      __html: htmlSafeJSONStringify(args),
    },
  });
}

export type JSONPrimitive = string | number | boolean | null;
export type JSONObject = { [member: string]: JSONValue };
export type JSONArray = JSONValue[];
export type JSONValue = JSONPrimitive | JSONObject | JSONArray;

export type SafePropsValue = JSONValue | ReactNode;

export interface OverrideResult {
  props: string;
}

export type StringifiedOverridesByScope = {
  [key: string]: string;
};
