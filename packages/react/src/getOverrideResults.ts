import { StringifiedOverridesByScope } from './env';
import { getRehydrationData } from './getRehydrationData';
import * as console from './console';

export interface EdgeLogMessage {
  type: 'log' | 'warn' | 'error';
  originator: 'system' | 'override';
  args: any[];
  title?: string;
}

export interface OutsmartlyScriptData {
  minFormatVersion: number;
  overrides: StringifiedOverridesByScope;
  logs: EdgeLogMessage[];
  endpoints?: {
    overrides?: string;
  };
}

export function getOutsmartlyScriptData(): OutsmartlyScriptData | null {
  const json = getRehydrationData();
  if (!json) {
    console.error('No rehydration information found from Outsmartly <script id="__OUTSMARTLY_DATA__" type="application/json">');
    return null;
  }

  return JSON.parse(json);
}
