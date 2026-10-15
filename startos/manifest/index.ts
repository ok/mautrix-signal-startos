import { setupManifest } from '@start9labs/start-sdk'
import { long, short } from './i18n'

export const manifest = setupManifest({
  id: 'mautrix-signal',
  title: 'mautrix-signal',
  license: 'AGPL-3.0',
  packageRepo: 'https://github.com/ok/mautrix-signal-startos',
  upstreamRepo: 'https://github.com/mautrix/signal',
  marketingUrl: 'https://docs.mau.fi/bridges/go/signal/index.html',
  donationUrl: 'https://github.com/sponsors/tulir',
  description: { short, long },
  volumes: ['main', 'db', 'startos'],
  images: {
    signal: {
      source: { dockerTag: 'dock.mau.dev/mautrix/signal:v0.2609.0' },
      arch: ['x86_64', 'aarch64'],
    },
    postgres: {
      source: { dockerTag: 'postgres:16-alpine' },
      arch: ['x86_64', 'aarch64'],
    },
  },
})
