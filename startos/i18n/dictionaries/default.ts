export const DEFAULT_LANG = 'en_US'

const dict = {
  // main.ts
  'Starting mautrix-signal!': 0,
  Database: 1,
  'Initializing Postgres': 2,
  Bridge: 3,
  'Synapse is not installed on this server': 4,
  'Synapse has no server name yet. Complete its Set Server Address/URL task first.': 5,
  'Connected to the homeserver': 6,
  'Connecting to the homeserver. If this persists, confirm the Register Appservice task on Synapse.': 7,
  'The bridge is not listening. If it keeps exiting with "as_token was not accepted", restart Synapse so it reloads the registration.': 8,
  // dependencies.ts
  'The Matrix homeserver this bridge attaches to as an appservice': 9,
  'Connect the Signal bridge (mautrix-signal) to this homeserver.': 10,
  // actions/settings.ts
  'End-to-bridge encryption': 11,
  'Whether the bridge works in encrypted Matrix rooms. Traffic to Signal is always encrypted; this is about the rooms on your homeserver.': 12,
  'Off — the bridge does not function in encrypted rooms': 13,
  'Allowed — works in rooms you encrypt, but does not encrypt new chats itself': 14,
  'Default — every new bridged chat is created encrypted': 15,
  'Backfill history': 16,
  'When linking, Signal offers to transfer message history to the bridge, and recent chats are created with their history. Off, chats appear as new messages arrive.': 17,
  'Bridge admins': 18,
  "Matrix users with the bridge's admin level, comma separated: a full ID such as @alice:example.com, or just the username for an account on this homeserver. Every account on this homeserver can use the bridge; admins additionally get the administration commands.": 19,
  Settings: 20,
  'Encryption, history backfill, and who administers the bridge': 21,
  'Not a Matrix user: ${admin}. Use @user:example.com or a username.': 22,
  // actions/botInfo.ts
  'Show Bridge Bot': 23,
  'The Matrix user to message to sign in to Signal and control the bridge': 24,
  'Synapse is not installed or has no server name yet, so the bot has no address.': 25,
  'Bridge Bot': 26,
  'Open a direct chat with this user from any Matrix client signed in to your homeserver, then send `login` and scan the QR code with the Signal app on your phone (Settings → Linked Devices). Send `help` for every command.': 27,
  'Bot user ID': 28,
} as const

/**
 * Plumbing. DO NOT EDIT.
 */
export type I18nKey = keyof typeof dict
export type LangDict = Record<(typeof dict)[I18nKey], string>
export default dict
