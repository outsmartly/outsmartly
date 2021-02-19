import * as React from 'react';
import {
  JSONValue,
  _outsmartly_emit_markers,
  _outsmartly_enabled,
} from './env';
import { applyOverrides } from './applyOverrides';
import { htmlSafeJSONStringify } from './htmlSafeJSONStringify';

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

export function _outsmartly_mark_return(
  scope: string,
  args: any[],
  branchSelections: { [key: string]: boolean },
  value: any,
): any {
  if (!_outsmartly_emit_markers) {
    return value;
  }

  const argsScriptElement = React.createElement('script', {
    type: 'application/json',
    'data-outsmartly-component': scope,
    dangerouslySetInnerHTML: {
      __html: htmlSafeJSONStringify({ args, branchSelections }),
    },
  });

  return React.createElement(React.Fragment, null, argsScriptElement, value);
}

export function _outsmartly_mark_attr(
  scope: string,
  sliceIds: string,
  value: any,
): typeof value {
  if (!_outsmartly_emit_markers) {
    return value;
  }

  return React.cloneElement(value, {
    'data-outsmartly-marker': `${scope}:${sliceIds}`,
  });
}

export function _outsmartly_mark_child(
  scope: string,
  sliceIds: string,
  value: any,
): typeof value {
  if (!_outsmartly_emit_markers) {
    return value;
  }

  const d = `${scope}:${sliceIds}`;

  return React.createElement(
    React.Fragment,
    null,
    React.createElement('outsmartly-marker', { d }, value),
  );
}
