import { StringifiedOverridesByScope } from './env';
import { getRehydrationData } from './getRehydrationData';

export interface LogMessage {
  type: 'log' | 'warn' | 'error';
  originator: 'system' | 'override';
  args: any[];
  title?: string;
}

export interface OutsmartlyScriptData {
  overrides: StringifiedOverridesByScope;
  logs: LogMessage[];
  host?: string;
}

export function getOutsmartlyScriptData(): OutsmartlyScriptData | null {
  const json = getRehydrationData();
  if (!json) {
    return null;
  }

  return JSON.parse(json);
}
