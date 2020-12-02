import chalk from 'chalk';

export function panic(msg: string = ''): never {
  console.error(
    chalk.bold(
      chalk.redBright(`🚨 Error ${msg || 'An unknown error occurred'}`)
    )
  );
  process.exit(1);
}
