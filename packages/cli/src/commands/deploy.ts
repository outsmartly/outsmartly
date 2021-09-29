import { Command, flags } from '@oclif/command';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as vm from 'vm';
import * as os from 'os';
import { pipeline } from 'stream/promises';
import chalk from 'chalk';
import { prompt } from 'inquirer';
import fetch, { Response, AbortError } from 'node-fetch';
import { AbortSignal } from 'node-fetch/externals';
import * as tar from 'tar-stream';
import gunzip from 'gunzip-maybe';
import { rollup, OutputChunk, RollupError, RollupWarning, RollupCache, RollupBuild } from 'rollup';
import rollupCommonJs from '@rollup/plugin-commonjs';
import rollupJson from '@rollup/plugin-json';
import rollupNodeResolve from '@rollup/plugin-node-resolve';
import { babel as rollupBabel } from '@rollup/plugin-babel';
import rollupInjectProcessEnv from 'rollup-plugin-inject-process-env';
import { terser as rollupTerser } from 'rollup-plugin-terser';
import chokidar from 'chokidar';
import { FSWatcher } from 'chokidar';
import cliSpinners from 'cli-spinners';
import ora from 'ora';
import { AbortController } from 'abortcontroller-polyfill/dist/cjs-ponyfill';
import multiline from 'multiline-template';
import { Analysis, APIError, apiFetch, ComponentAnalysis, patchSite, PatchSite, AnalysisByOrigin } from '../api';
import { panic } from '../panic';

type Environments = {
  name: string;
  origin: string;
}[];

type Origins = {
  origin: string;
  default?: boolean;
}[];

const SUPPORTED_EXTENSIONS = ['.js', '.jsx', '.mjs', '.mjsx', '.cjs', '.cjsx', '.ts', '.tsx'];

const absolutePath = /^(?:\/|(?:[A-Za-z]:)?[\\|/])/;
function isAbsolute(path: string) {
  return absolutePath.test(path);
}

function relativeId(id: string) {
  if (typeof process === 'undefined' || !isAbsolute(id)) return id;
  return path.relative(process.cwd(), id);
}

function handleRollupError(err: RollupWarning, fatal?: false): void;
function handleRollupError(err: RollupError, fatal?: true): never;
function handleRollupError(err: RollupWarning | RollupError, fatal = false): never | void {
  let description = err.message || err;
  if (err.name) description = `${err.name}: ${description}`;
  const message = (err.plugin ? `(plugin ${err.plugin}) ${description}` : description) || err;

  console.error(chalk.bold(chalk.red(`[!] ${chalk.bold(message.toString())}`)));

  if (err.url) {
    console.error(chalk.cyan(err.url));
  }

  if (err.loc) {
    console.error(`${relativeId((err.loc.file || err.id)!)} (${err.loc.line}:${err.loc.column})`);
  } else if (err.id) {
    console.error(relativeId(err.id));
  }

  if (err.frame) {
    console.error(chalk.dim(err.frame));
  }

  console.error('');

  if (fatal) {
    process.exit(1);
  }
}

interface Flags {
  config: string | undefined;
  watch: boolean;
  token: string | undefined;
  minify: boolean;
  reactImportSource: string;
  help: void;
}

export default class Deploy extends Command {
  static description = 'Deploy your Outsmartly configuration from outsmartly.config.js';

  static examples = [`$ outsmartly deploy`];

  static flags = {
    config: flags.string({
      description: 'Path to your Outsmartly config file.',
      helpValue: JSON.stringify('path/to/outsmartly.config.js'),
    }),
    watch: flags.boolean({
      description: 'Redeploy when files change.',
      default: false,
    }),
    token: flags.string({
      description:
        'Access token, if provided, otherwise the CLI will look for OUTSMARTLY_TOKEN. If not defined, it will prompt you to provide one.',
    }),
    minify: flags.boolean({
      description: 'Minify the result of bundling your outsmartly.config.js',
      default: false,
    }),
    reactImportSource: flags.string({
      description: 'Name of the package where Babel should import the JSX helpers from.',
      default: 'react',
    }),
    help: flags.help({
      char: 'h',
      description: 'Show this help screen.',
    }),
  };

  static args = [
    {
      name: 'environment',
      required: true,
      description: "Environment you want to deploy to. Currently only supports 'production'.",
      options: ['production'],
    },
  ];

  flags!: Flags;
  watcher?: FSWatcher;
  pendingDeployCount = 0;
  watchedFiles = new Set<string>();
  cache?: RollupCache;
  abortController = new AbortController();
  spinner = ora();

  async findBearerToken(): Promise<string> {
    const { token: bearerTokenOverride } = this.flags;
    const configFilePath = path.join(os.homedir(), '.config', 'outsmartly', 'config.json');

    let bearerToken = bearerTokenOverride ?? process.env.OUTSMARTLY_TOKEN;
    if (!bearerToken) {
      const answers = await prompt({
        type: 'input',
        name: 'bearerToken',
        message: 'Paste your access token: ',
        validate(bearerToken) {
          if (!bearerToken || typeof bearerToken !== 'string' || bearerToken.length < 36) {
            throw "That doesn't seem to be a valid access token. If you're having trouble, contact support@outsmartly.com.";
          }
          return true;
        },
      });
      bearerToken = answers.bearerToken as string;
      try {
        const config = {
          cli: {
            bearerToken,
          },
        };
        const json = JSON.stringify(config, null, 2);
        fs.outputFileSync(configFilePath, json);
      } catch (e) {
        console.error(`Unable to write outsmartly configuration file to: ${configFilePath}`);
        console.error(e);
      }
    }

    return bearerToken;
  }

  findOutsmartlyConfigPath(customConfigPath?: string): string {
    if (customConfigPath) {
      const fullPath = path.resolve(process.cwd(), customConfigPath);
      if (!fs.existsSync(fullPath)) {
        throw new Error(`No config file could be found at the provided custom path: ${customConfigPath}`);
      }
      return fullPath;
    }

    for (const ext of SUPPORTED_EXTENSIONS) {
      const fullPath = path.resolve(process.cwd(), `outsmartly.config${ext}`);
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }

    throw new Error(
      `No Outsmartly config file could be found at ${path.resolve(process.cwd(), 'outsmartly.config.js')}`,
    );
  }

  async run() {
    const { args, flags } = this.parse(Deploy);
    this.flags = flags;
    const { config: customConfigPath, watch } = flags;
    const { environment } = args;

    const bearerToken = await this.findBearerToken();
    const configFullPath = this.findOutsmartlyConfigPath(customConfigPath);

    if (watch) {
      this.watcher = chokidar.watch(configFullPath).on('change', async () => {
        this.pendingDeployCount++;
        this.spinner.stop();
        console.log(chalk.dim('🔍 Detected changes'));

        // Only one deployment at a time. We'll check this count after
        // the current deployment is done and come back to it.
        if (this.pendingDeployCount > 1) {
          this.abortController.abort();
          this.abortController = new AbortController();
          return;
        }

        await this.deploy(bearerToken, environment, configFullPath);
      });
    }

    this.pendingDeployCount++;
    await this.deploy(bearerToken, environment, configFullPath);
  }

  setupWatchers(): void {
    const prevWatchedFiles = new Set(this.watchedFiles);

    for (const module of this.cache?.modules!) {
      // These are internal rollup paths that don't really exist
      // so we have to skip them.
      if (module.id.startsWith('\x00')) {
        continue;
      }
      this.watchedFiles.add(module.id);
      prevWatchedFiles.delete(module.id);
      this.watcher!.add(module.id);
    }

    // This runs over left-over files that were previously needing
    // to be watched but no longer are.
    for (const filePath of prevWatchedFiles) {
      this.watcher!.unwatch(filePath);
    }
  }

  async rollupOutsmartlyConfigFile(configPath: string): Promise<{ chunk: OutputChunk; bundle: RollupBuild }> {
    const { flags } = this;
    const plugins = [
      rollupBabel({
        babelHelpers: 'bundled',
        babelrc: false,
        presets: [
          [
            '@babel/preset-react',
            {
              runtime: 'automatic',
              importSource: flags.reactImportSource,
            },
          ],
          '@babel/preset-typescript',
        ],
        plugins: ['@babel/plugin-proposal-class-properties'],
        extensions: SUPPORTED_EXTENSIONS,
        include: '**',
        compact: false,
      }),
      rollupNodeResolve({
        browser: true,
        preferBuiltins: false,
        extensions: SUPPORTED_EXTENSIONS,
      }),
      rollupCommonJs({
        dynamicRequireTargets: ['node_modules/enquire.js/**/*.js'],
        extensions: SUPPORTED_EXTENSIONS,
      }),
      rollupJson(),
      rollupInjectProcessEnv({
        NODE_ENV: 'production',
      }),
    ];

    if (flags.minify) {
      plugins.push(rollupTerser());
    }

    const bundle = await rollup({
      input: configPath,
      cache: this.cache,
      onwarn(warning, _warn) {
        switch (warning.code) {
          // Swallow these warnings because they happen frequently in real code.
          // e.g. it seems to happen for any code that deals with Next.js router
          // like using <Link>
          case 'CIRCULAR_DEPENDENCY':
          case 'THIS_IS_UNDEFINED':
            return;

          case 'NON_EXISTENT_EXPORT':
            handleRollupError(warning, true);
            return;

          case 'UNRESOLVED_IMPORT':
            warning.message = `'${warning.source}' is imported by ${warning.importer}, but could not be resolved`;
            handleRollupError(warning, true);
            return;
        }

        warning.message = `Rollup Bundler Warning: ${warning.message}`;
        handleRollupError(warning);
      },
      plugins,
    });

    const { output } = await bundle.generate({
      format: 'cjs',
      exports: 'named',
      // This might be needed later, so keep it around since it took me a while to
      // figure out how to emit __esModule
      //esModule: false,
      sourcemap: true,
    });

    if (output.length !== 1) {
      throw new Error(`Rollup generate() returned ${output.length} assets, but we expected only 1.`);
    }

    const chunk = output[0];

    return { chunk, bundle };
  }

  async bundleAnalysis(origin: string, artifacts: { [key: string]: string }): Promise<Analysis> {
    try {
      const input: { [key: string]: string } = {};
      const vfsForRollup: { [key: string]: string } = {};
      const components: { [key: string]: ComponentAnalysis } = {};
      let hasAnalysis = false;

      for (const [filePath, content] of Object.entries(artifacts)) {
        if (path.dirname(filePath).endsWith('modules')) {
          const indexOfFirstNewline = content.indexOf('\n');
          const firstLine = content.slice(0, indexOfFirstNewline);
          const originalRelativePathComment = firstLine.match(/^\/\/ (.+)$/);
          if (!originalRelativePathComment) {
            throw new Error(`Malformed path for module: ${firstLine}`);
          }
          const originalRelativePath = originalRelativePathComment[1];
          if (originalRelativePath.startsWith('node_modules/')) {
            continue;
          }
          const originalModuleContent = content.slice(indexOfFirstNewline + 1);
          vfsForRollup[originalRelativePath] = originalModuleContent;
        }

        if (filePath.endsWith('.json')) {
          hasAnalysis = true;
          const component = JSON.parse(content);
          const { scope, filename, moduleThunkRaw } = component;

          const virtualFilePath = `${filename}`;
          const filenameWithOutExt = filename.slice(0, filename.lastIndexOf('.'));

          input[filenameWithOutExt] = filename;
          vfsForRollup[virtualFilePath] = moduleThunkRaw;
          // No need to send this to the server now as the vfs
          // has the end result of it.
          component.moduleThunkRaw = null;
          components[scope] = component;
        }
      }

      // No components were analyized, so don't go further cause Rollup will
      // die a horrible death.
      if (!hasAnalysis) {
        return { components: {}, vfs: {} };
      }

      const bundle = await rollup({
        input,
        external: ['react'],
        plugins: [
          {
            name: 'custom-outsmartly-virtual',
            resolveId(id, importer) {
              if (id in vfsForRollup) {
                return id;
              }

              if (id.match(/^[/.]/) && importer) {
                const parts = path.parse(id);
                const resolved = path.relative(process.cwd(), path.resolve(path.dirname(importer), id));

                if (resolved in vfsForRollup) {
                  return resolved;
                }

                for (const ext of SUPPORTED_EXTENSIONS) {
                  if (resolved + ext in vfsForRollup) {
                    return resolved + ext;
                  }

                  const indexNamed = path.join(resolved, `index${ext}`);
                  if (indexNamed in vfsForRollup) {
                    return indexNamed;
                  }

                  const doubleNamed = path.join(resolved, parts.name + ext);
                  if (doubleNamed in vfsForRollup) {
                    return doubleNamed;
                  }
                }
              }
            },

            load(id) {
              return vfsForRollup[id];
            },
          },
          {
            name: 'custom-outsmartly-next.js-fix',
            transform(code: string, id: string) {
              // tl;dr import Next.js package files directly doesn't work
              // as expected with Rollup. This fixes it.
              // https://github.com/vercel/next.js/pull/19920
              if (id.match(/\/node_modules\/next\/[a-zA-Z0-9]+\.js/)) {
                return multiline`
                  |${code}
                  |exports.__esModule = true;
                  |exports.default = module.exports.default;
                `;
              }
              return code;
            },
          },
          rollupNodeResolve({
            browser: true,
            preferBuiltins: false,
            extensions: SUPPORTED_EXTENSIONS,
          }),
          rollupCommonJs({
            dynamicRequireTargets: ['node_modules/enquire.js/**/*.js'],
            extensions: SUPPORTED_EXTENSIONS,
          }),
          rollupBabel({
            babelHelpers: 'bundled',
            babelrc: false,
            presets: ['@babel/preset-react', '@babel/preset-typescript'],
            plugins: ['@babel/plugin-proposal-class-properties'],
            extensions: SUPPORTED_EXTENSIONS,
            include: '**',
            compact: false,
          }),
          rollupInjectProcessEnv({
            NODE_ENV: 'production',
          }),
        ],
        onwarn(warning, _warn) {
          switch (warning.code) {
            // Swallow these warnings because they happen frequently in real code.
            // e.g. it seems to happen for any code that deals with Next.js router
            // like using <Link>
            case 'CIRCULAR_DEPENDENCY':
            case 'THIS_IS_UNDEFINED':
              return;

            case 'NON_EXISTENT_EXPORT':
              handleRollupError(warning, true);
              return;

            case 'UNRESOLVED_IMPORT':
              warning.message = `'${warning.source}' is imported by ${warning.importer}, but could not be resolved`;
              handleRollupError(warning, true);
              return;
          }

          warning.message = `Rollup Bundler Warning: ${warning.message}`;
          handleRollupError(warning);
        },
      });
      const { output } = await bundle.generate({
        format: 'cjs',
        exports: 'named',
        /* manualChunks(id, { getModuleInfo, getModuleIds }) {
          const relativePath = path.relative(process.cwd(), id);
          if (relativePath.startsWith('node_modules')) {
            return relativePath
              .replace(/^(node_modules\/[^/]+\/).+$/, '$1')
              .replace(/-/gm, '--')
              .replace(/\//gm, '-');
          }
        }, */
      });

      const vfs: { [key: string]: string } = {};

      for (const entry of output) {
        switch (entry.type) {
          case 'chunk':
            vfs[entry.fileName] = entry.code;
            break;

          case 'asset': {
            if (typeof entry.source !== 'string') {
              throw new Error(multiline`
                |Unable to bundle this project's analysis results due to a dependency of your component that is not currently serializable.
                |Feel free to reach out to discuss, if you think this is a mistake or you want support!
                |
                |Asset: ${entry.fileName}
              `);
            }
            vfs[entry.fileName] = entry.source;
            break;
          }

          default:
            throw new Error(`Unhandled rollup chunk entry type ${(entry as any).type}. This is a bug with Outsmartly.`);
        }
      }
      return { components, vfs };
    } catch (e) {
      console.error(e);
      throw new Error(`Unexpected analysis results for ${origin}.`);
    }
  }

  private async extractAnalysis(res: Response): Promise<{ [key: string]: string }> {
    if (!res.body?.pipe) {
      throw new Error('Could not read body of response.');
    }

    const analysisFiles: { [key: string]: string } = {};
    const extract = tar.extract();

    extract.on('entry', (header, stream, next) => {
      if (header.type !== 'file') {
        return next();
      }

      const data: Buffer[] = [];

      stream
        .on('data', (chunk) => {
          data.push(Buffer.from(chunk));
        })
        .on('end', () => {
          analysisFiles[header.name] = Buffer.concat(data).toString('utf8');
          next();
        });

      stream.resume();
    });

    await pipeline(res.body, gunzip(), extract, { signal: this.abortController.signal });

    return analysisFiles;
  }

  private async bundleAllOrigins(origins: Origins): Promise<AnalysisByOrigin> {
    if (!origins.length) {
      console.log('Deploying without any defined origins. Is this intentional?');
    }

    return (
      await Promise.all(
        origins.map(async ({ origin, default: isDefault }) => {
          const url = `${origin}/_outsmartly_artifacts.tar.gz`;
          const response: Response = await fetch(url, { signal: this.abortController.signal });

          if (!response.ok) {
            throw new Error(`Could not download artifacts for ${origin}.`);
          }

          const artifactsMap = await this.extractAnalysis(response);
          const bundledAnalysis = await this.bundleAnalysis(origin, artifactsMap);
          return { origin, default: isDefault, analysis: bundledAnalysis };
        }),
      )
    ).reduce((analysisByOrigin: AnalysisByOrigin, { origin, default: isDefault, analysis }) => {
      analysisByOrigin[origin] = { analysis, default: isDefault };
      return analysisByOrigin;
    }, {});
  }

  async deploy(bearerToken: string, environment: string, configPath: string): Promise<void> {
    this.spinner.spinner = cliSpinners.dots12;
    this.spinner.color = 'blue';
    this.spinner.text = chalk.dim(chalk.blue('Bundling configuration...'));
    this.spinner.start();
    let progressTimer!: ReturnType<typeof setTimeout>;

    try {
      const { chunk, bundle } = await this.rollupOutsmartlyConfigFile(configPath);
      this.cache = bundle.cache;
      if (this.watcher) {
        this.setupWatchers();
      }

      // If there's a pending deploy let's give up on this one
      if (this.pendingDeployCount > 1) {
        return;
      }

      const context = { console };
      const options = {
        filename: configPath,
      };
      const iife = vm.runInNewContext(`(function (module, exports) { ${chunk.code} });`, context, options);
      const module: any = { exports: {} };
      iife(module, module.exports);
      const { host, environments, origins }: { host: string; environments?: Environments; origins?: Origins } =
        module.exports.default;

      if (!host) {
        throw new Error(`Missing 'host' field in ${configPath}.`);
      }
      if (typeof environments !== 'undefined' && typeof origins !== 'undefined') {
        throw new Error(`Cannot have both environments and origins defined in ${configPath}.`);
      }

      let analysisByOrigin: AnalysisByOrigin;
      if (Array.isArray(origins)) {
        analysisByOrigin = await this.bundleAllOrigins(origins);
      } else if (Array.isArray(environments)) {
        const { origin } = environments.find((environment) => environment.name === 'production') ?? {};

        if (!origin) {
          throw new Error(`Missing 'production' environment in 'environments' in ${configPath}.`);
        }

        analysisByOrigin = await this.bundleAllOrigins([{ origin, default: true }]);
      } else {
        throw new Error(`Must have either environments or origins array defined in ${configPath}.`);
      }

      if (!analysisByOrigin) {
        throw new Error(`No artifacts found at origins in ${configPath}.`);
      }

      this.spinner.spinner = spinnerClockwise;
      this.spinner.text = chalk.blue(`Deploying to Outsmartly... (${environment})`);

      // TODO: Edge API/runtime must handle this new format and the old format
      // e.g. check for analysis vs analysisByOrigin
      const sitePatch: PatchSite = {
        host,
        configRaw: chunk.code,
        analysisByOrigin,
      };
      const deployment = await patchSite(sitePatch, {
        bearerToken,
        cliVersion: this.config.version,
        signal: this.abortController.signal,
      });

      // If there's a pending deploy let's give up on this one
      if (this.pendingDeployCount > 1) {
        return;
      }

      this.spinner.spinner = spinnerCounterClockwise;
      this.spinner.text = chalk.blue('Verifying deployment...');

      progressTimer = setTimeout(() => {
        this.spinner.text = chalk.blue(
          'Still waiting for deployment propagation. This sometimes takes a minute or two...',
        );

        progressTimer = setTimeout(() => {
          this.spinner.color = 'yellow';
          this.spinner.text = chalk.yellow(
            'Deployment propagation seems to be taking longer than usual. Still waiting...',
          );

          progressTimer = setTimeout(() => {
            this.spinner.color = 'red';
            this.spinner.text = chalk.red(
              'We seem to be having trouble confirming whether your changes have been deployed. You can continue to wait, or you might try again.',
            );
          }, 1000 * 60);
        }, 1000 * 40);
      }, 1000 * 20);

      let fetchManifestCount = 0;
      const deployTime = new Date(deployment.updatedAt).getTime();

      while (true) {
        // If there's a pending deploy let's give up on this one
        if (this.pendingDeployCount > 1) {
          return;
        }

        fetchManifestCount++;
        const manifest = await this.fetchManifest(host);
        const lastUpdatedTime = new Date(manifest.updatedAt).getTime();

        // We don't use workerId/deployment.id because it's possible that someone
        // else will have deployed at the same time. Instead, we'll just care that
        // it is at least as new as the one we deployed.
        if (deployTime <= lastUpdatedTime) {
          break;
        }

        await sleep(1000 * fetchManifestCount, this.abortController.signal);
      }

      clearTimeout(progressTimer);

      this.spinner.stopAndPersist({
        symbol: '🚀',
        text: chalk.green(`Deployed to Outsmartly (${environment}) https://${host}/`),
      });
    } catch (e: any) {
      // aborting isn't actually an error, just ignore it and move on
      if (e instanceof AbortError) {
        return;
      }

      this.spinner.fail('Deploying failed');

      if (e instanceof APIError) {
        panic(`Server Response: ${e.json.errors.join('\n')}`);
      }

      if (!e) {
        panic();
      }

      if (e.code) {
        handleRollupError(e, true);
      }

      if (e.stack) {
        panic(`Unexpected error: ${e.stack}`);
      }

      if (e.message) {
        panic(`Unexpected error: ${e.message}`);
      }

      panic(e);
    } finally {
      clearTimeout(progressTimer);
      // If files changed in the middle of our previous deployment we
      // need to do another one now.
      if (this.pendingDeployCount > 1) {
        this.pendingDeployCount = 1;
        await this.deploy(bearerToken, environment, configPath);
      } else {
        this.pendingDeployCount = 0;
        if (this.flags.watch) {
          console.log(chalk.dim('🔍 Watching for changes...'));
        }
      }
    }
  }

  async fetchManifest(host: string): Promise<Manifest> {
    const url = `https://${host}/__outsmartly__/manifest.json?t=${Date.now()}`;
    return await apiFetch(url, {
      cliVersion: this.config.version,
      signal: this.abortController.signal,
    });
  }
}

interface Manifest {
  updatedAt: string;
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', abort);
      resolve();
    }, ms);
    const abort = () => {
      clearTimeout(timer);
      reject(new AbortError('aborting sleep'));
    };
    signal?.addEventListener('abort', abort, { once: true });
  });

const spinnerClockwise = {
  interval: 80,
  frames: ['⡇ ', '⡏ ', '⠉ ', '⠉⠉', ' ⢹', ' ⢸', ' ⣸', ' ⣀', '⣀⣀', '⣇ '],
};
const spinnerCounterClockwise = {
  interval: 80,
  frames: spinnerClockwise.frames.slice(0).reverse(),
};
