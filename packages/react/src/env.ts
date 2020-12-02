import React, { ReactNode } from 'react';
import { htmlEscapeJsonString } from './htmlEscapeJsonString';

export const _outsmartly_dev_mode =
  !!process.env.OUTSMARTLY_DEV || !!process.env.NEXT_PUBLIC_OUTSMARTLY_DEV;

// Regarding NEXT_PUBLIC_OUTSMARTLY_DEV:
// AFAIK there is no way in Next to send process.env variables to
// the *browser* bundle without prefixing it. While understandable,
// not having any way to do it at all means we have to special case.
export const _outsmartly_enabled =
  process.env.NODE_ENV === 'production' || _outsmartly_dev_mode;

// This intentionally returns 'null' instead of 'false' because in some
// cases 'false' would still be rendered, e.g. JSX attributes
export const _outsmartly_emit_markers =
  (_outsmartly_enabled && typeof window !== 'object') || null;

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
  return React.createElement('script', {
    type: 'application/json',
    'data-outsmartly-component': scope,
    dangerouslySetInnerHTML: {
      __html: htmlEscapeJsonString(args),
    },
  });
}

export type JSONPrimitive = string | number | boolean | null;
export type JSONObject = { [member: string]: JSONValue };
export type JSONArray = JSONValue[];
export type JSONValue = JSONPrimitive | JSONObject | JSONArray;

export interface OverrideResult {
  name: string;
  props: {
    [key: string]: JSONValue;
  };
}

export type OverridesByScope = {
  [key: string]: OverrideResult;
};
