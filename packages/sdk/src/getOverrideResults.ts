import { OverridesByScope } from './env';
import { getRehydrationData } from './getRehydrationData';

export interface OverrideConsoleMessage {
  type: 'log' | 'warn' | 'error';
  originator: 'system' | 'override';
  args: any[];
  title?: string;
}

export interface OutsmartlyScriptData {
  overrides: OverridesByScope;
  overrideConsoleMessages: OverrideConsoleMessage[];
}

export function getOutsmartlyScriptData(): OutsmartlyScriptData | null {
  const json = getRehydrationData();
  if (!json) {
    return null;
  }

  return JSON.parse(json);
}
