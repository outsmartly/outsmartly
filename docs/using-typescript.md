# Using TypeScript

Outsmartly provides type definitions in the `@outsmartly/core` npm package. These can be used inside your UI code, outsmartly.config.ts, or for custom plugins, middleware, etc.

To use TypeScript for your config, use the CLI's `--config` flag:

```bash
outsmartly deploy production --config outsmartly.config.ts
```

Note that while Outsmartly's CLI supports TypeScript syntax inside your config, it does not do any actual type checking itself. You can use the `tsc` TypeScript CLI to do type checking separately, along with their [`noEmit` option](https://www.typescriptlang.org/tsconfig#noEmit) to do type checking only.
