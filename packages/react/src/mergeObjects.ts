import React, { ReactElement } from 'react';
import { SafePropsValue } from './env';

function convertToReactElement(value: ReactElement): ReactElement {
  deserializeValue(value, 'props');
  // How createElement works for 'key' is inconsistent--you have to pass key as
  // a prop but then it doesn't actually get stored as a prop on the element.
  // It seems to always be 'null' but let's be safe!
  if (value.key !== null && value.key !== undefined) {
    value.props.key = value.key;
  }

  return React.createElement(value.type, value.props);
}

function deserializeValue(obj: any, key: string | number): void {
  if (!obj || typeof obj !== 'object') {
    return;
  }

  const value = obj[key];
  if (!value || typeof value !== 'object') {
    return;
  }

  if (Array.isArray(value)) {
    for (let i = 0, l = value.length; i < l; i++) {
      deserializeValue(value, i);
    }
    return;
  }

  if (isProbablySerializedReactElement(value)) {
    obj[key] = convertToReactElement(value);
    return;
  }

  for (const key of Object.keys(value)) {
    deserializeValue(value, key);
  }

  return;
}

function isProbablySerializedReactElement(value: {
  [key: string]: any;
}): value is ReactElement {
  return (
    value.hasOwnProperty('ref') &&
    value.hasOwnProperty('key') &&
    value.hasOwnProperty('props')
  );
}

function mergeProperty(
  override: { [key: string]: SafePropsValue },
  original: { [key: string]: SafePropsValue },
  key: string,
): void {
  const originalValue = original[key];

  // If there is no override for this field we can use it as-is
  // and don't need to traverse the value deeper
  if (!override.hasOwnProperty(key)) {
    override[key] = originalValue;
    return;
  }

  const overrideValue = override[key];
  // Primitives don't require traversal
  if (!overrideValue || typeof overrideValue !== 'object') {
    return;
  }

  if (isProbablySerializedReactElement(overrideValue)) {
    override[key] = convertToReactElement(overrideValue);
    return;
  }

  // Arrays are opaquely overridden
  if (Array.isArray(overrideValue)) {
    for (let i = 0, l = overrideValue.length; i < l; i++) {
      deserializeValue(overrideValue, i);
    }
    return;
  }

  mergeObjects(overrideValue, originalValue);
}

export function mergeObjects(override: any, original: any): void {
  for (const key of Object.keys(original)) {
    mergeProperty(override, original, key);
  }
}
