import { T } from '@start9labs/start-sdk'
import { homeserverHostId } from 'synapse-startos/startos/interfaces'
import { manifest as synapseManifest } from 'synapse-startos/startos/manifest'
import { nginxPort } from 'synapse-startos/startos/utils'
import { sdk } from './sdk'

// The appservice listener Synapse pushes events to. Bound on the host bridge
// only (no exported interface): nothing but the homeserver ever dials it.
export const appserviceHostId = 'appservice'
export const appservicePort = 29328

// Identity of the bridge on the homeserver. Fixed: Synapse's registration file
// is written from these values, and changing them would orphan every portal
// room the bridge has created.
export const appserviceId = 'signal'
export const botLocalpart = 'signalbot'
export const usernameTemplate = 'signal_{{.}}'
// Covers the ghost users and the bot. The bot is deliberately *not* the
// registration's sender: Synapse refuses /sync for an appservice's sender
// user, and the bridge's encryption helper syncs as the bot.
export const userNamespaceRegex = (serverName: string) =>
  `@(signal_.*|${botLocalpart}):${serverName.replace(/\./g, '\\.')}`

export const mountpoint = '/data'
export const configSubpath = 'config.yaml'
export const configPath = `${mountpoint}/${configSubpath}`
export const bridgeBinary = '/usr/bin/mautrix-signal'

export const postgresUser = 'mautrix'
export const postgresDb = 'mautrix_signal'
export const postgresMountpoint = '/var/lib/postgresql'

// Synapse: the id, host and internal port are the stable contract imported
// from its package; the external port is resolved live on the host bridge.
export const synapseId = synapseManifest.id
export const synapseHostId = homeserverHostId
export const synapseInternalPort = nginxPort
export const synapseVersionRange = '>=1.162.0:4'
export const synapseHealthCheck = 'synapse'

// Synapse's `main` volume, mounted read-only into this package's runtime so
// the server name can be read from its homeserver.yaml. The same location
// synapse-startos's own `ensureAppserviceRegistration` helper uses.
export const synapseMountpoint = '/mnt/synapse'
export const synapseConfigPath = `${synapseMountpoint}/homeserver.yaml`
// The identity synapse-startos writes at install, before the user picks one.
export const synapsePlaceholderServerName = 'placeholder.com'

export const mountSynapseVolume = async (effects: T.Effects) =>
  sdk.mount(effects, {
    location: synapseMountpoint,
    target: {
      packageId: synapseId,
      volumeId: 'main',
      subpath: null,
      readonly: true,
      idmap: [],
    },
  })

export const mount = sdk.Mounts.of().mountVolume({
  volumeId: 'main',
  subpath: null,
  mountpoint,
  readonly: false,
})

export const isMxid = (s: string) => /^@[^:\s]+:[^\s]+$/.test(s)
export const isLocalpart = (s: string) => /^[a-z0-9._=\-/+]+$/.test(s)
