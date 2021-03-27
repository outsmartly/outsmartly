import React, { ReactNode } from 'react';
import { OutsmartlyScriptData } from './getOverrideResults';
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

export type PageOverrides =
  | {
      isLoading: false;
      pathname: string;
      data?: OutsmartlyScriptData;
    }
  | {
      isLoading: true;
      pathname: string;
      suspensePromise: Promise<void>;
    };

export const root: any =
  typeof globalThis === 'object'
    ? globalThis
    : typeof self === 'object'
    ? self
    : typeof global === 'object'
    ? global
    : null;

interface OutsmartlyInternalState {
  overridesByPathname: { [key: string]: PageOverrides };
  currentPathname: string;
  hasRehydrated: boolean;
  endpoints: {
    overrides: string;
  };
}

// It's possible there will be more than one copy of the SDK in the same app.
// Sometimes this is bad, but there's also unavoidable cases, like in Gatsby v3:
// https://github.com/gatsbyjs/gatsby/discussions/28138#discussioncomment-419052
//
// When this happens, we want to share state between all the copies to at least try
// to have things "just work." If the multiple copies are actually different version,
// this might cause things to behave in unexpected ways.
export const state: OutsmartlyInternalState = (root.__OUTSMARTLY__ ??= {
  overridesByPathname: Object.create(null),
  currentPathname: typeof location === 'object' ? location.pathname : '',
  endpoints: {
    overrides: '/.outsmartly/overrides',
  },
  hasRehydrated: typeof window !== 'object',
} as OutsmartlyInternalState);
