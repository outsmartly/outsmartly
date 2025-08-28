import chalk from 'chalk';

export function warn(msg: string = ''): void {
  console.log(chalk.bold(chalk.yellowBright(`⚠️ Warning: ${msg}`)));
}

export function panic(msg: string = ''): never {
  console.error(chalk.bold(chalk.redBright(`🚨 Error ${msg || 'An unknown error occurred'}`)));
  process.exit(1);
}
