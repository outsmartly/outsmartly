import { StringifiedOverridesByScope } from './env';
import { getRehydrationData } from './getRehydrationData';

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
    return null;
  }

  return JSON.parse(json);
}
