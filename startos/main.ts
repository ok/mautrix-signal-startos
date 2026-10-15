import { configYaml, PermissionLevel } from './fileModels/config.yaml'
import { storeJson } from './fileModels/store.json'
import { synapseServerName } from './fileModels/synapseHomeserver.yaml'
import { i18n } from './i18n'
import { sdk } from './sdk'
import {
  appserviceHostId,
  appservicePort,
  bridgeBinary,
  configPath,
  isMxid,
  mount,
  mountSynapseVolume,
  mountpoint,
  postgresDb,
  postgresMountpoint,
  postgresUser,
  synapseHostId,
  synapseId,
  synapseInternalPort,
} from './utils'

export const main = sdk.setupMain(async ({ effects }) => {
  console.info(i18n('Starting mautrix-signal!'))

  const store = await storeJson
    .read((s) => ({
      asToken: s.asToken,
      hsToken: s.hsToken,
      pgPassword: s.pgPassword,
      admins: s.admins,
    }))
    .const(effects)
  if (!store?.asToken || !store.hsToken || !store.pgPassword) {
    throw new Error('store.json is missing the tokens generated at install')
  }

  // Synapse's homeserver port on the host bridge. Its binding is `http`, so
  // it publishes a plaintext and a TLS address; the bridge dials plaintext.
  // Null while Synapse is not installed — then nothing is written for it and
  // the health check says why.
  const synapseAddress = await sdk.host
    .getBridgeAddress(effects, {
      packageId: synapseId,
      hostId: synapseHostId,
      internalPort: synapseInternalPort,
      ssl: false,
    })
    .const()

  // Where Synapse reaches this bridge. Informational in the config (the
  // registration Synapse holds is what it actually dials), kept in step.
  const ownAddress = await sdk.host
    .getBridgeAddress(effects, {
      hostId: appserviceHostId,
      internalPort: appservicePort,
    })
    .const()

  let serverName: string | null = null
  if (synapseAddress) {
    try {
      await mountSynapseVolume(effects)
      serverName = await synapseServerName.const(effects)
    } catch (e) {
      console.warn(`[!] Cannot read Synapse's homeserver.yaml: ${String(e)}`)
    }
  }

  const permissions: Record<string, PermissionLevel> = { '*': 'relay' }
  if (serverName) {
    permissions[serverName] = 'user'
    for (const admin of store.admins) {
      permissions[isMxid(admin) ? admin : `@${admin}:${serverName}`] = 'admin'
    }
  }

  await configYaml.update(effects, (c) =>
    c === null
      ? null
      : {
          ...c,
          homeserver: {
            ...c.homeserver,
            address: synapseAddress ? `http://${synapseAddress}` : '',
            domain: serverName ?? '',
          },
          appservice: {
            ...c.appservice,
            address: ownAddress ? `http://${ownAddress}` : '',
            as_token: store.asToken!,
            hs_token: store.hsToken!,
          },
          database: {
            ...c.database,
            uri: `postgres://${postgresUser}:${store.pgPassword}@127.0.0.1:5432/${postgresDb}?sslmode=disable`,
          },
          // The whole map is replaced: a merge would keep entries for a
          // server name or admin that no longer applies.
          bridge: { ...c.bridge, permissions },
        },
  )

  // Restart on the settings the Settings action writes.
  await configYaml
    .read((c) => ({ encryption: c.encryption, backfill: c.backfill }))
    .const(effects)

  const signalSub = sdk.SubContainer.of(
    effects,
    { imageId: 'signal' },
    mount,
    'signal-sub',
  )

  const postgresSub = sdk.SubContainer.of(
    effects,
    { imageId: 'postgres' },
    sdk.Mounts.of().mountVolume({
      volumeId: 'db',
      subpath: null,
      mountpoint: postgresMountpoint,
      readonly: false,
    }),
    'postgres-sub',
  )

  return sdk.Daemons.of(effects)
    .addDaemon('postgres', {
      subcontainer: postgresSub,
      exec: {
        command: sdk.useEntrypoint(['-c', 'listen_addresses=127.0.0.1']),
        env: {
          POSTGRES_USER: postgresUser,
          POSTGRES_PASSWORD: store.pgPassword,
          POSTGRES_DB: postgresDb,
          POSTGRES_INITDB_ARGS: '--encoding=UTF8 --locale=C',
        },
      },
      ready: {
        display: i18n('Database'),
        fn: async () => {
          const { exitCode } = await postgresSub.exec([
            'pg_isready',
            '-U',
            postgresUser,
            '-d',
            postgresDb,
            '-h',
            '127.0.0.1',
          ])
          return exitCode === 0
            ? { result: 'success', message: null }
            : { result: 'loading', message: i18n('Initializing Postgres') }
        },
      },
      requires: [],
    })
    .addDaemon('bridge', {
      subcontainer: signalSub,
      exec: {
        command: [bridgeBinary, '-c', configPath],
        cwd: mountpoint,
      },
      ready: {
        display: i18n('Bridge'),
        gracePeriod: 15_000,
        fn: async () => {
          if (!synapseAddress) {
            return {
              result: 'failure',
              message: i18n('Synapse is not installed on this server'),
            }
          }
          if (!serverName) {
            return {
              result: 'failure',
              message: i18n(
                'Synapse has no server name yet. Complete its Set Server Address/URL task first.',
              ),
            }
          }
          // The bridge answers /ready with 200 once it has verified the
          // homeserver and its appservice registration, and 5xx until then.
          try {
            const res = await Promise.race([
              fetch(`http://127.0.0.1:${appservicePort}/_matrix/mau/ready`),
              new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('timeout')), 2_000),
              ),
            ])
            return res.ok
              ? {
                  result: 'success',
                  message: i18n('Connected to the homeserver'),
                }
              : {
                  result: 'loading',
                  message: i18n(
                    'Connecting to the homeserver. If this persists, confirm the Register Appservice task on Synapse.',
                  ),
                }
          } catch {
            return {
              result: 'failure',
              message: i18n(
                'The bridge is not listening. If it keeps exiting with "as_token was not accepted", restart Synapse so it reloads the registration.',
              ),
            }
          }
        },
      },
      requires: ['postgres'],
    })
})
