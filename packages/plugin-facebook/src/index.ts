import { setupFbpFbc } from './fbcookies';
import { setupFbEvents, Options } from './fbevents';
import { OutsmartlyMiddlewareEvent, Plugin } from '@outsmartly/core';

export function facebookPlugin(options: Options): Plugin {
  return {
    name: '@outsmartly/plugin-facebook',
    setup({ config, messageBus }) {
      /**
       * Handle fbp & fbc cookies for each user
       */
      config.middleware?.unshift(
        async (event: OutsmartlyMiddlewareEvent, next) => {
          setupFbpFbc(event);
          const response = await next();
          return response;
        },
      );

      /**
       * Configure all facebook events as per EdgeMessagebus events
       */
      setupFbEvents({ messageBus, options });
    },
  };
}
