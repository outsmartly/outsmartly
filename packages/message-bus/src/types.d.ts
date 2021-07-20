import { MessageBus } from './MessageBus';

declare global {
  const __OUTSMARTLY_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_HIRED__: {
    messageBus: MessageBus;
  };
}
