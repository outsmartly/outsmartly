import React from 'react';

function convertToReactElement(value: {
  type: any;
  key: any;
  ref: any;
  props: any;
}) {
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

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends any[]
    ? T[K]
    : T extends object
    ? DeepPartial<T[K]>
    : T[K];
};

function isProbablySerializedReactElement(value: { props?: object }): boolean {
  return (
    value.hasOwnProperty('ref') &&
    value.hasOwnProperty('key') &&
    value.hasOwnProperty('props')
  );
}

export function mergeOverrides(original: any, override: any): unknown {
  if (!override || typeof override !== 'object') {
    return override;
  }

  if (
    // Maybe the original is not a object but the override is.
    !original ||
    typeof original !== 'object' ||
    // If the original is an array but our override isn't, then we can no longer
    // safely merge and need to just choose the override.
    Array.isArray(original) ||
    // Arrays are not merged, they are replaced as-is. If someone wants them
    // to be merged they can use property keys e.g. { 0: a, 1: b }.
    Array.isArray(override)
  ) {
    for (const key of Object.keys(override)) {
      deserializeValue(override, key);
    }
    return override;
  }

  // JSON.stringified React elements have to be deserialized into real ones.
  if (isProbablySerializedReactElement(override)) {
    return convertToReactElement(override);
  }

  const output = {};

  for (const key of Object.keys(original)) {
    // Lack of index-signature makes 'any' casts needed, unless someone
    // knows how to type this function with one?
    (output as any)[key] = override.hasOwnProperty(key)
      ? mergeOverrides((original as any)[key], (override as any)[key])
      : (original as any)[key];
  }

  return output;
}
