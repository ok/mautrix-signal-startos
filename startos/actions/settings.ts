import { configYaml } from '../fileModels/config.yaml'
import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { isLocalpart, isMxid } from '../utils'

const { InputSpec, Value } = sdk

export const inputSpec = InputSpec.of({
  encryption: Value.select({
    name: i18n('End-to-bridge encryption'),
    description: i18n(
      'Whether the bridge works in encrypted Matrix rooms. Traffic to Signal is always encrypted; this is about the rooms on your homeserver.',
    ),
    default: 'allow',
    values: {
      disabled: i18n('Off — the bridge does not function in encrypted rooms'),
      allow: i18n(
        'Allowed — works in rooms you encrypt, but does not encrypt new chats itself',
      ),
      default: i18n('Default — every new bridged chat is created encrypted'),
    },
  }),
  backfill: Value.toggle({
    name: i18n('Backfill history'),
    description: i18n(
      'When linking, Signal offers to transfer message history to the bridge, and recent chats are created with their history. Off, chats appear as new messages arrive.',
    ),
    default: false,
  }),
  admins: Value.text({
    name: i18n('Bridge admins'),
    description: i18n(
      "Matrix users with the bridge's admin level, comma separated: a full ID such as @alice:example.com, or just the username for an account on this homeserver. Every account on this homeserver can use the bridge; admins additionally get the administration commands.",
    ),
    required: false,
    default: null,
    placeholder: 'alice, @bob:example.com',
    masked: false,
  }),
})

export const settings = sdk.Action.withInput(
  'settings',

  async ({ effects }) => ({
    name: i18n('Settings'),
    description: i18n(
      'Encryption, history backfill, and who administers the bridge',
    ),
    warning: null,
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  }),

  inputSpec,

  async ({ effects }) => {
    const config = await configYaml
      .read((c) => ({ encryption: c.encryption, backfill: c.backfill }))
      .once()
    const admins = (await storeJson.read((s) => s.admins).once()) ?? []
    const encryption: 'disabled' | 'allow' | 'default' = !config?.encryption
      .allow
      ? 'disabled'
      : config.encryption.default
        ? 'default'
        : 'allow'
    return {
      encryption,
      backfill: config?.backfill.enabled ?? false,
      admins: admins.join(', '),
    }
  },

  async ({ effects, input }) => {
    const admins = (input.admins ?? '')
      .split(',')
      .map((a) => a.trim())
      .filter((a) => a.length > 0)
    for (const admin of admins) {
      if (!isMxid(admin) && !isLocalpart(admin)) {
        throw new Error(
          i18n(
            'Not a Matrix user: ${admin}. Use @user:example.com or a username.',
            { admin },
          ),
        )
      }
    }

    await configYaml.merge(effects, {
      encryption: {
        allow: input.encryption !== 'disabled',
        default: input.encryption === 'default',
      },
      backfill: { enabled: input.backfill },
    })
    await storeJson.merge(effects, { admins })
  },
)
