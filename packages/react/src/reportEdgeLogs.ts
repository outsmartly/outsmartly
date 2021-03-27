import { EdgeLogMessage } from './getOverrideResults';

export function reportEdgeLogs(logs: EdgeLogMessage[], pathname: string): void {
  if (!logs || logs.length === 0) {
    return;
  }

  console.group(
    `%c(${logs.length}) Outsmartly Edge logs for path ${pathname}`,
    'font-size: 12px; font-weight: normal;',
  );
  for (const message of logs) {
    const { type = 'log', originator, title, args = [] } = message;
    let pre = '%c[Outsmartly';

    if (originator) {
      pre += ` ${message.originator.toUpperCase()}`;
    }

    pre += ']';

    if (title) {
      pre += ` ${title}:`;
    }

    switch (type) {
      case 'log': {
        console.log(pre, 'margin-left: 10px; color: #999;', ...args);
        break;
      }

      case 'warn': {
        console.warn(pre, 'color: #999;', ...args);
        break;
      }

      case 'error': {
        console.error(pre, 'color: #999;', ...args);
        break;
      }

      default:
    }
  }
  console.groupEnd();
}
