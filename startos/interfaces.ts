import { sdk } from './sdk'
import { appserviceHostId, appservicePort } from './utils'

// The bridge has no user-facing interface: people talk to it through the
// bridge bot in their Matrix client. Its one listener is the appservice
// endpoint Synapse pushes events to, bound on the host bridge and nowhere
// else — a binding with no exported interface is reachable from other
// containers at 10.0.3.1:<assigned port> and never from the LAN.
export const setInterfaces = sdk.setupInterfaces(async ({ effects }) => {
  await sdk.MultiHost.of(effects, appserviceHostId).bindPort(appservicePort, {
    protocol: null,
    preferredExternalPort: appservicePort,
    addSsl: null,
    secure: { ssl: false },
  })
  return []
})
