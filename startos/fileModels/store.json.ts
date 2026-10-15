import { FileHelper, z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'

// StartOS-side state the bridge's own config has no place for. Lives on the
// `startos` volume, which no subcontainer mounts.
const shape = z.looseObject({
  // Appservice tokens, generated once at install. Synapse's registration file
  // is written from them, so they are stable for the life of the install.
  asToken: z.string().optional().catch(undefined),
  hsToken: z.string().optional().catch(undefined),
  pgPassword: z.string().optional().catch(undefined),
  // The registration's sender_localpart: a random, never-used user. It must
  // not be the bot (see userNamespaceRegex in utils.ts).
  senderLocalpart: z.string().optional().catch(undefined),
  // Matrix users granted the bridge's admin permission level. Bare localparts
  // are resolved against Synapse's server name when the config is rendered.
  admins: z.array(z.string()).catch([]),
})

export const storeJson = FileHelper.json(
  { base: sdk.volumes.startos, subpath: 'store.json' },
  shape,
)
