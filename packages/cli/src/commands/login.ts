import { Command, flags } from '@oclif/command';
import { CallbackParamsType, generators, Issuer } from 'openid-client';
import open from 'open';
import http from 'http';
import { URL } from 'url';
import { IncomingMessage } from 'http';
import { ServerResponse } from 'http';

export default class Login extends Command {
  static description = 'login with your Outsmartly credentials';

  static flags = {
    browser: flags.string({
      description: 'browser to open SSO with (example: "firefox", "safari")',
    }),
    sso: flags.boolean({
      hidden: true,
      char: 's',
      description: 'login for enterprise users under SSO',
    }),
    interactive: flags.boolean({
      char: 'i',
      description: 'login with username/password',
    }),
    'expires-in': flags.integer({
      char: 'e',
      description: 'duration of token in seconds (default 1 year)',
    }),
  };

  async run() {
    const { flags } = await this.parse(Login);

    await this.login();
  }

  async login() {
    const server = await new Promise<any>((resolve) => {
      const s = http.createServer();
      s.listen(3424, () => resolve(s));
    });
    const { port } = server.address();

    const issuer = await Issuer.discover('https://outsmartly.us.auth0.com/.well-known/openid-configuration');

    const client = new issuer.Client({
      client_id: 'xiOTmRnhCijHhEK3Ij20W4yonuETY5c0',
      redirect_uris: ['https://www.edgebailey.com/'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
    });

    const code_verifier = generators.codeVerifier();
    const code_challenge = generators.codeChallenge(code_verifier);

    const authorizationUrl = await client.authorizationUrl({
      scope: 'openid profile email offline_access',
      code_challenge,
      code_challenge_method: 'S256',
      prompt: 'login'
    });

    const params = await new Promise<CallbackParamsType>((resolve, reject) => {
      server.on('request', (req: IncomingMessage, resp: ServerResponse) => {
        const params = client.callbackParams(req);
        resp.end('You may now close this window.');
        resolve(params);
      });

      open(authorizationUrl);
    });
    server.close();

    const tokenSet = await client.oauthCallback('https://www.edgebailey.com/', params, { code_verifier });
    console.log(tokenSet);
    const user = await client.userinfo(tokenSet.access_token!);
    console.log(user);
    const result = await client.refresh(tokenSet.refresh_token!);
    console.log(result);
  }
}
