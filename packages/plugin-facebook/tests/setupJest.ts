import 'event-target-polyfill';
import 'fast-text-encoding';
import { Crypto } from '@peculiar/webcrypto';

globalThis.crypto = new Crypto();
