import React, { ReactNode } from 'react';
import { htmlEscapeJsonString } from './htmlEscapeJsonString';

export const _outsmartly_enabled =
  process.env.NODE_ENV === 'production' || process.env.OUTSMARTLY_DEV;

// This intentionally returns 'null' instead of 'false' because in some
// cases 'false' would still be rendered, e.g. JSX attributes
export const _outsmartly_emit_markers =
  (_outsmartly_enabled && typeof window !== 'object') || null;

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
