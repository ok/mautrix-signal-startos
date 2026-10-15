# mautrix-signal

mautrix-signal bridges Signal into the Synapse homeserver on this server. Once you link your
Signal account, every Signal chat appears as a Matrix room, and you read and reply from any
Matrix client. You keep using Signal on your phone as before; the bridge is one more linked
device, like Signal Desktop.

## Documentation

- <https://docs.mau.fi/bridges/go/signal/authentication.html> — linking your Signal account to the bridge
- <https://docs.mau.fi/bridges/general/using-bridges.html> — day-to-day use: how bridged chats, contacts and groups behave
- <https://docs.mau.fi/bridges/general/end-to-bridge-encryption.html> — what the encryption setting does
- <https://docs.mau.fi/bridges/general/double-puppeting.html> — sending from your own Matrix account instead of a ghost user
- <https://docs.mau.fi/bridges/go/signal/index.html> — the bridge's overview page

## What you get on StartOS

- **No web interface.** You control the bridge by chatting with its bot, `@signalbot:<your server name>`, from your Matrix client. The **Show Bridge Bot** action tells you the exact address.
- **A required Synapse dependency.** The bridge attaches to the Synapse on this server and registers itself there automatically.
- **Its own database.** The bridge keeps its Signal session keys and chat mappings in a bundled PostgreSQL. Both are included in backups.
- **Settings** for end-to-bridge encryption, history backfill, and which Matrix users are bridge admins. Every account on your homeserver may use the bridge.

## Getting set up

1. Install and set up **Synapse** first. Its server name must be set and it must be running.
2. Install mautrix-signal. Synapse will show a critical **Register Appservice** task raised by this bridge; open it and run the action with the values it has already filled in. Synapse restarts to load the registration.
3. Start mautrix-signal. The **Bridge** health check turns green once it has connected to Synapse.
4. Run **Show Bridge Bot** and copy the bot's user ID.
5. In your Matrix client (Element, for example), signed in to an account on this homeserver, start a direct chat with the bot and send `login`.
6. On your phone, open Signal → Settings → Linked Devices → Link New Device, and scan the QR code the bot sends. If you turned on **Backfill history** in Settings, Signal asks whether to transfer message history; either answer works.
7. The bot confirms the login. Your Signal chats now appear as rooms as messages arrive (or straight away, with backfill).

Each person on your homeserver who wants Signal does steps 4 to 7 with their own Signal account.

Send `help` to the bot for every command, including `logout` and `list-logins`.

## Things to know

- **Encryption** defaults to *Allowed*: the bridge works in rooms you encrypt but does not encrypt new bridged chats on its own. Choose *Default* in Settings to create every bridged chat encrypted, or *Off* to keep the bridge out of encrypted rooms entirely.
- **Bridge admins** get the bridge's administration commands on top of normal use. Enter usernames (for accounts on this homeserver) or full Matrix IDs, separated by commas.
- **Double puppeting** (messages you send from your phone showing as you rather than as a ghost user) works with the manual method only: send `login-matrix` to the bot with an access token for your account, as the linked documentation describes. The automatic method needs a second appservice registration that Synapse on StartOS cannot create yet.
- **Reinstalling** the bridge raises the Register Appservice task on Synapse again with new tokens. After running it, restart Synapse once, or the bridge keeps exiting with `as_token was not accepted`.
- **Uninstalling** the bridge leaves its registration behind on Synapse. Remove it there with the **Delete Appservice** action, choosing `signal`.
