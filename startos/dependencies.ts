import { ensureAppserviceRegistration } from 'synapse-startos/startos/public'
import { storeJson } from './fileModels/store.json'
import { synapseServerName } from './fileModels/synapseHomeserver.yaml'
import { i18n } from './i18n'
import { sdk } from './sdk'
import {
  appserviceHostId,
  appserviceId,
  appservicePort,
  mountSynapseVolume,
  synapseHealthCheck,
  synapseId,
  synapseVersionRange,
  userNamespaceRegex,
} from './utils'

const synapse = sdk.Dependency.required(synapseId, {
  description: i18n(
    'The Matrix homeserver this bridge attaches to as an appservice',
  ),
  metadata: {
    title: 'Synapse',
    icon: 'https://raw.githubusercontent.com/Start9Labs/synapse-startos/419c08bede61f713c09ef8be5a02d43ff6183c53/icon.svg',
  },
  versionRange: synapseVersionRange,
  kind: 'running',
  healthChecks: [synapseHealthCheck],
}).withInit(async (effects) => {
  // Re-run whenever Synapse is installed, removed, or changes state, so the
  // registration is raised the moment there is a homeserver to raise it on.
  await sdk.getStatus(effects, { packageId: synapseId }).const()

  const tokens = await storeJson
    .read((s) => ({
      asToken: s.asToken,
      hsToken: s.hsToken,
      senderLocalpart: s.senderLocalpart,
    }))
    .const(effects)
  const url = await sdk.host
    .getBridgeAddress(effects, {
      hostId: appserviceHostId,
      internalPort: appservicePort,
    })
    .const()
  if (!tokens?.asToken || !tokens.hsToken || !tokens.senderLocalpart || !url)
    return

  // Synapse's volume is mounted by the helper; the server name is read from
  // it here so the namespace regex is exact. Absent until Synapse is
  // installed and named, which is also when the registration can exist.
  let serverName: string | null
  try {
    await mountSynapseVolume(effects)
    serverName = await synapseServerName.const(effects)
  } catch (e) {
    console.info(`[i] Synapse volume not readable yet: ${String(e)}`)
    return
  }
  if (!serverName) return

  await ensureAppserviceRegistration(effects, {
    id: appserviceId,
    asToken: tokens.asToken,
    hsToken: tokens.hsToken,
    senderLocalpart: tokens.senderLocalpart,
    url: `http://${url}`,
    rateLimited: false,
    userNamespaceRegex: userNamespaceRegex(serverName),
    reason: i18n(
      'Connect the Signal bridge (mautrix-signal) to this homeserver.',
    ),
  })
})

export const dependencies = sdk.Dependencies.of().addDependency(synapse)
