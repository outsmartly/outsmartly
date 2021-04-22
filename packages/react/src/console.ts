export function log(msg: string, ...args: unknown[]): void {
  console.log(`[Outsmartly SDK] ${msg}`, ...args);
}

export function warn(msg: string, ...args: unknown[]): void {
  console.warn(`[Outsmartly SDK] ${msg}`, ...args);
}

export function error(msg: string, ...args: unknown[]): void {
  console.error(`[Outsmartly SDK] ${msg}`, ...args);
}
