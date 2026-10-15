import { FileHelper, z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'
import {
  appserviceId,
  appservicePort,
  botLocalpart,
  configSubpath,
  usernameTemplate,
} from '../utils'

// mautrix-signal's config.yaml. Seeded at install from the example the bridge
// itself generates, so every upstream key is present with its upstream
// default; this shape models only what the package enforces or exposes.
// Everything else passes through untouched (z.looseObject at every level).

const homeserverShape = z.looseObject({
  // Rendered by main from Synapse's host-bridge address and server name.
  address: z.string().catch(''),
  domain: z.string().catch(''),
  software: z.literal('standard').catch('standard'),
})

const botShape = z.looseObject({
  username: z.literal(botLocalpart).catch(botLocalpart),
  displayname: z.string().catch('Signal bridge bot'),
})

const appserviceShape = z.looseObject({
  address: z.string().catch(''),
  // The bridge lives in its own container; Synapse reaches it over the host
  // bridge, so the listener must not be loopback-only.
  hostname: z.literal('0.0.0.0').catch('0.0.0.0'),
  port: z.literal(appservicePort).catch(appservicePort),
  id: z.literal(appserviceId).catch(appserviceId),
  bot: botShape.catch(() => botShape.parse({})),
  // Synapse's Register Appservice action writes no push_ephemeral flag into
  // the registration, so the homeserver never sends these; claiming them
  // here would only mislead.
  ephemeral_events: z.literal(false).catch(false),
  as_token: z.string().catch(''),
  hs_token: z.string().catch(''),
  username_template: z.literal(usernameTemplate).catch(usernameTemplate),
})

const databaseShape = z.looseObject({
  type: z.literal('postgres').catch('postgres'),
  uri: z.string().catch(''),
  max_open_conns: z.number().catch(5),
  max_idle_conns: z.number().catch(1),
})

export const permissionLevels = ['relay', 'commands', 'user', 'admin'] as const
export type PermissionLevel = (typeof permissionLevels)[number]

const bridgeShape = z.looseObject({
  command_prefix: z.string().catch('!signal'),
  // Rendered by main: everyone on this homeserver is a user, the configured
  // admins are admins, anyone else only ever reaches the relaybot (off).
  permissions: z
    .record(z.string(), z.enum(permissionLevels))
    .catch({ '*': 'relay' }),
})

const encryptionShape = z.looseObject({
  // Yours — the Settings action.
  allow: z.boolean().catch(true),
  default: z.boolean().catch(false),
  require: z.boolean().catch(false),
  // Synapse refuses /sync for an appservice's sender user, so the bot's
  // device must be created the MSC4190 way (native in Synapse >= 1.141) or
  // encryption cannot receive keys at all.
  msc4190: z.literal(true).catch(true),
})

const backfillShape = z.looseObject({
  // Yours — the Settings action.
  enabled: z.boolean().catch(false),
})

const analyticsShape = z.looseObject({
  token: z.null().catch(null),
})

export const stdoutWriter = { type: 'stdout', format: 'pretty' }
const loggingShape = z.looseObject({
  min_level: z.string().catch('info'),
  // Service logs are StartOS's job; the example's file writer would fill the
  // data volume with a second copy.
  writers: z
    .array(z.looseObject({ type: z.string(), format: z.string().optional() }))
    .catch([stdoutWriter]),
})

const shape = z.looseObject({
  homeserver: homeserverShape.catch(() => homeserverShape.parse({})),
  appservice: appserviceShape.catch(() => appserviceShape.parse({})),
  database: databaseShape.catch(() => databaseShape.parse({})),
  bridge: bridgeShape.catch(() => bridgeShape.parse({})),
  encryption: encryptionShape.catch(() => encryptionShape.parse({})),
  backfill: backfillShape.catch(() => backfillShape.parse({})),
  analytics: analyticsShape.catch(() => analyticsShape.parse({})),
  logging: loggingShape.catch(() => loggingShape.parse({})),
})

export type Config = z.infer<typeof shape>

export const configYaml = FileHelper.yaml(
  { base: sdk.volumes.main, subpath: configSubpath },
  shape,
)
