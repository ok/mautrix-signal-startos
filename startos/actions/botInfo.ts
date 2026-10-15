import { synapseServerName } from '../fileModels/synapseHomeserver.yaml'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { botLocalpart, mountSynapseVolume } from '../utils'

export const botInfo = sdk.Action.withoutInput(
  'bot-info',

  async ({ effects }) => ({
    name: i18n('Show Bridge Bot'),
    description: i18n(
      'The Matrix user to message to sign in to Signal and control the bridge',
    ),
    warning: null,
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  }),

  async ({ effects }) => {
    let serverName: string | null = null
    try {
      await mountSynapseVolume(effects)
      serverName = await synapseServerName.once()
    } catch {}
    if (!serverName) {
      throw new Error(
        i18n(
          'Synapse is not installed or has no server name yet, so the bot has no address.',
        ),
      )
    }

    return {
      version: '1',
      title: i18n('Bridge Bot'),
      message: i18n(
        'Open a direct chat with this user from any Matrix client signed in to your homeserver, then send `login` and scan the QR code with the Signal app on your phone (Settings → Linked Devices). Send `help` for every command.',
      ),
      result: {
        type: 'single',
        name: i18n('Bot user ID'),
        description: null,
        value: `@${botLocalpart}:${serverName}`,
        masked: false,
        copyable: true,
        qr: false,
        launchable: false,
      },
    }
  },
)
