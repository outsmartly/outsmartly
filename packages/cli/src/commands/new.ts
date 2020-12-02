import fs from 'fs';
import path from 'path';
import { Command, flags } from '@oclif/command';
import { prompt } from 'inquirer';
import { APIError, postSite, PostSite } from '../api';
import multiline from 'multiline-template';
import { panic } from '../panic';

export default class New extends Command {
  static description =
    'Create an Outsmartly account and initialize local environment';

  static examples = [`$ outsmartly new`];

  static flags = {
    name: flags.string({
      description: 'A human-friendly name for your website',
      helpValue: 'My Example Site',
    }),
    config: flags.string({
      description:
        'path to where you would like your new Outsmartly config file',
      helpValue: JSON.stringify('path/to/outsmartly.config.js'),
      default: './outsmartly.config.js',
    }),
    help: flags.help({ char: 'h', description: 'show this help screen' }),
  };

  static args = [
    {
      name: 'host',
      description:
        'The domain name host you want to serve traffic through Outsmartly',
      helpValue: 'example.com',
    },
  ];

  async run() {
    const { args, flags } = this.parse(New);
    let { host } = args;
    let { name } = flags;
    const { config: configPath } = flags;
    const configFullPath = path.resolve(process.cwd(), configPath);

    const bearerToken = process.env.OUTSMARTLY_TOKEN;
    if (!bearerToken) {
      panic('Missing OUTSMARTLY_TOKEN environment variable');
    }

    if (!host) {
      const answers = await prompt({
        type: 'input',
        name: 'host',
        message: 'What is your domain name?',
        validate(host) {
          if (!host.match(/([a-zA-Z0-9]+\.)*[a-zA-Z0-9]+\.[a-zA-Z]+/)) {
            throw "That doesn't seem to be a valid domain name.";
          }
          return true;
        },
      });
      host = answers.host as string;
    }

    if (!name) {
      const answers = await prompt({
        type: 'input',
        name: 'name',
        message: "What is a human-friendly name for your site? e.g. 'My Site'",
        validate(host) {
          return host.length > 1;
        },
      });
      name = answers.name as string;
    }

    const config = multiline`
      |{
      |  host: '${host}',
      |  environments: [{
      |    name: 'production',
      |    origin: 'https://${host}',
      |  }],
      |  routes: []
      |}
    `;
    const configRaw = `module.exports.default = ${config};`;
    const analysis = {
      components: {},
      vfs: {},
    };

    try {
      const site: PostSite = {
        host,
        name,
        configRaw,
        analysis,
        userIds: [],
      };
      await postSite(site, {
        bearerToken,
        cliVersion: this.config.version,
      });
    } catch (e) {
      if (e instanceof APIError) {
        panic(e.json.errors.join('\n'));
      }

      throw e;
    }

    if (!fs.existsSync(configFullPath)) {
      fs.writeFileSync(configFullPath, `export default ${config};`);
      console.log(`Created ${configPath}`);
    }

    console.log(`\n${host} created successfully!\n`);
  }
}
