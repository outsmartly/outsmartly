declare module 'multiline-template' {
  // Tagged templates actually receive a TemplateStringsArray with a .raw field
  // but we don't use it, and using a regular array means folks can call it as
  // a regular function as well.
  export default function multiline(
    strings: string[],
    ...args: string[]
  ): string;
  export default function multiline(
    strings: TemplateStringsArray,
    ...args: string[]
  ): string;
}

declare module 'abortcontroller-polyfill/dist/cjs-ponyfill' {
  import { AbortSignal } from 'node-fetch/externals';

  export class AbortController {
    signal: AbortSignal;
    abort(): void;
  }
}

declare module '@rollup/plugin-virtual' {
  import { Plugin } from 'rollup';
  export default function virtual(vfs: { [key: string]: string }): Plugin;
}
