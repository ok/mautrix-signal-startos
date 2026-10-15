import { FileHelper, z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'
import { synapseConfigPath, synapsePlaceholderServerName } from '../utils'

// Read-only view of Synapse's homeserver.yaml, mounted from its `main`
// volume. Only the server name is modeled; nothing here ever writes it.
const shape = z.looseObject({
  server_name: z.string(),
})

export const synapseHomeserverYaml = FileHelper.yaml(
  { base: sdk.volumes.main, subpath: 'unused-synapse-homeserver.yaml' },
  shape,
).withPath(synapseConfigPath)

/** Synapse's server name, or null while it still carries the install placeholder. */
export const synapseServerName = synapseHomeserverYaml.read((h) =>
  h.server_name === synapsePlaceholderServerName ? null : h.server_name,
)
