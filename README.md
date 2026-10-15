<p align="center">
  <img src="icon.png" alt="mautrix-signal Logo" width="21%">
</p>

# mautrix-signal on StartOS

> Everything not listed in this document should behave the same as upstream mautrix-signal.
> If a feature, setting, or behavior is not mentioned here, the upstream
> documentation is accurate and fully applicable — see the Documentation section of
> `instructions.md` for links.

## Table of Contents

- [Image and Container Runtime](#image-and-container-runtime)
- [Volume and Data Layout](#volume-and-data-layout)
- [File Models](#file-models)
- [Dependencies](#dependencies)
- [Network Access and Interfaces](#network-access-and-interfaces)
- [Installation and First-Run Flow](#installation-and-first-run-flow)
- [Actions](#actions)
- [Tasks](#tasks)
- [Health Checks](#health-checks)
- [Backups and Restore](#backups-and-restore)
- [Limitations and Differences](#limitations-and-differences)
- [Quick Reference for AI Consumers](#quick-reference-for-ai-consumers)

## Image and Container Runtime

Two prebuilt images, both for `x86_64` and `aarch64`:

| Image                                   | Subcontainer   | Daemon     | Runs                                                   |
| --------------------------------------- | -------------- | ---------- | ------------------------------------------------------ |
| `dock.mau.dev/mautrix/signal:v0.2609.0` | `signal-sub`   | `bridge`   | `/usr/bin/mautrix-signal -c /data/config.yaml`, cwd `/data`, as root |
| `postgres:16-alpine`                    | `postgres-sub` | `postgres` | The image entrypoint with `listen_addresses=127.0.0.1` |

The bridge image's own entrypoint (`docker-run.sh`) is bypassed: it exists to generate a config and a registration file on first run and exit, which the package does itself. The binary is run directly, so there is no init system and no `runAsInit`. The image drops to uid 1337 through `su-exec` when run its own way; here the bridge runs as root in its subcontainer and owns everything on `/data`.

The bridge upgrades `config.yaml` in place on every start (adding keys a newer release introduces, with their upstream defaults, and re-emitting upstream's comments). That is upstream behaviour and the package relies on it: see [File Models](#file-models).

Upstream pins and how to bump them: `UPDATING.md`.

## Volume and Data Layout

| Volume    | Mount Point                      | Purpose                                                        |
| --------- | -------------------------------- | -------------------------------------------------------------- |
| `main`    | `/data` (signal)                 | `config.yaml`, the only file the bridge keeps outside Postgres |
| `db`      | `/var/lib/postgresql` (postgres) | The PostgreSQL data directory: Signal session keys, chat and user mappings, message IDs, backfill state |
| `startos` | not mounted                      | `store.json`: the appservice tokens, the registration's sender localpart, the Postgres password, the admin list |

Losing `db` means every user has to link Signal again and every portal room is forgotten. Losing `startos` means the tokens are gone: a fresh install generates new ones and re-registers.

## File Models

| File          | Format | Modelled                | Written by                                   |
| ------------- | ------ | ----------------------- | -------------------------------------------- |
| `config.yaml` | YAML   | Yes — `FileHelper.yaml` | Install, every init, `main`, Settings, and the bridge itself on start |
| `store.json`  | JSON   | Yes — `FileHelper.json` | Install, and Settings                        |

`config.yaml` is seeded at install from the example the bridge generates (`mautrix-signal -e`), so every upstream key is present with upstream's default. The model covers only what the package enforces or exposes; every level is a loose object, and all other keys pass through untouched.

**Enforced** — rewritten by `main` on every start: `homeserver.address` (Synapse's host-bridge address) and `homeserver.domain` (its server name, read from Synapse's mounted `homeserver.yaml`); `appservice.address`, `hostname` (`0.0.0.0`), `port` (`29328`), `id` (`signal`), `bot.username` (`signalbot`), `username_template` (`signal_{{.}}`), `as_token`/`hs_token`, and `ephemeral_events: false`; `database.type` and `uri` (the bundled Postgres over loopback); `analytics.token: null`; `encryption.msc4190: true`; and the whole `bridge.permissions` map.

**`encryption.msc4190` is forced on.** Synapse refuses `/sync` for an appservice's sender user, and the bridge's encryption helper syncs as the bot, so the bot must get its device the MSC4190 way (native in Synapse 1.141+) rather than through appservice login. Without it every sync returns HTTP 500 and no encrypted room ever works.

**`bridge.permissions` is replaced, not merged.** It is `{"*": relay, <server name>: user, <each admin>: admin}`. A merge would keep a stale server name or a removed admin, so `main` writes the complete map. Relay mode is off upstream by default and not exposed, so the `relay` level for everyone else means "no access".

**`ephemeral_events` is forced off.** Synapse's Register Appservice action writes no `de.sorunome.msc2409.push_ephemeral` flag into the registration, so the homeserver never pushes typing, receipts or presence to the bridge. The config says so rather than claiming a feature that does not arrive.

**Set once at install, then yours**: `encryption.allow: true` (upstream's example says `false`, and a valid example value is not replaced by a schema default, so it is written explicitly), `logging.min_level: info` with a single stdout writer (the example also logs at debug to `./logs/`, which would duplicate the service log onto the data volume), and the example's placeholder `double_puppet.servers`/`secrets` entries removed.

**Yours** — the Settings action: `encryption.allow`, `encryption.default`, `backfill.enabled`, and the admin list in `store.json`. Everything else in the file keeps upstream's value, and the bridge re-adds anything missing on start.

**Absent means absent.** With Synapse not installed, `homeserver.address` and `domain` are written empty; the bridge then exits and the Bridge health check names the cause rather than a fabricated address being dialled.

Synapse's `homeserver.yaml` is read from Synapse's `main` volume, mounted read-only at `/mnt/synapse` in this package's runtime — the same mount synapse-startos's own registration helper makes. Only `server_name` is modelled, and nothing here writes it. While it still holds Synapse's install placeholder (`placeholder.com`), it reads as no name.

## Dependencies

One, required.

| Dependency | Kind      | Version       | Health checks |
| ---------- | --------- | ------------- | ------------- |
| `synapse`  | `running` | `>=1.162.0:4` | `synapse`     |

The Synapse package's code is an npm dependency (`synapse-startos`, pinned by the lockfile to a commit of its `next` branch). The package imports its `ensureAppserviceRegistration` helper, the `homeserver` host id and nginx port, and its manifest. The dependency's init handler calls the helper whenever Synapse's status, this package's tokens, or its own host-bridge address changes: the helper compares the registration on Synapse's volume with the current tokens and raises a critical Register Appservice task on Synapse when they differ.

The bridge dials Synapse at its homeserver binding's plaintext host-bridge address (`10.0.3.1:<assigned port>`), resolved live; nothing is hardcoded. Synapse reaches the bridge the same way, at the URL written into the registration.

## Network Access and Interfaces

No interface is exported. The bridge binds one port, `29328`, on the host bridge only: it has no exported interface, so it is reachable from Synapse's container at `10.0.3.1:29328` and from nowhere on the LAN. The provisioning API (`/_matrix/provision`) and public media are not reachable from outside the server and are not configured.

Outbound: the bridge connects to Signal's servers directly, as any Signal client does. It needs the internet; nothing routes it through Tor.

## Installation and First-Run Flow

1. Synapse must be installed with its server name set. The package reads that name; without it the Bridge health check reports "Synapse has no server name yet".
2. Install generates the two appservice tokens, a random sender localpart (`signal-as-<16 chars>`) and the Postgres password into `store.json`, writes the example `config.yaml`, applies the install-time defaults above, and raises **Register Appservice** on Synapse with every field prefilled: id `signal`, that random sender, URL `http://10.0.3.1:29328`, user namespace `@(signal_.*|signalbot):<server name>` with dots escaped, not rate limited.

   **The sender is deliberately not the bot.** Synapse blocks `/sync` for a registration's sender user, and the bridge syncs as `@signalbot` for encryption, so the bot is claimed through the namespace instead, exactly as upstream's own generated registration does.
3. The user runs that action on Synapse. Synapse writes `appservices/signal.yaml`, adds it to `app_service_config_files`, and restarts.
4. The service starts, the bridge registers `@signalbot:<server name>`, Synapse pings it, and the Bridge check goes green.
5. **Show Bridge Bot** gives the bot's user ID; each user DMs it, sends `login`, and scans the QR code with the Signal app. That step needs a phone and cannot be automated.

Starting the service while the Register Appservice task is open is refused (critical task). `start-cli package start mautrix-signal --force` bypasses that, but the bridge then exits with `as_token was not accepted` until the registration exists.

## Actions

### Show Bridge Bot

Prints `@signalbot:<server name>` with the one-paragraph login procedure. Read-only; any status. Fails with a clear message when Synapse is absent or unnamed.

### Settings

Three fields; prefilled from the current config and store.

- **End-to-bridge encryption**: *Off* (`allow: false`), *Allowed* (`allow: true, default: false`, the package default), or *Default* (`allow: true, default: true`). `require` is never set.
- **Backfill history**: `backfill.enabled`. Upstream default off; when on, Signal offers history transfer at link time.
- **Bridge admins**: comma-separated usernames or full Matrix IDs. A bare username becomes `@<name>:<server name>` when `main` renders the permissions map. An entry that is neither form is rejected with its value named.

Writing restarts the service (`main` watches the encryption and backfill keys). Safe to repeat.

## Tasks

| Task                           | Severity   | Raised when                                                               | Cleared when                                    |
| ------------------------------ | ---------- | ------------------------------------------------------------------------- | ----------------------------------------------- |
| Register Appservice (on Synapse) | `critical` | This package's tokens differ from the registration on Synapse's volume: first install, and any reinstall | Synapse's action runs with the prefilled input |

The task is raised *on Synapse* by this package, with `when: input-not-matches`, so it re-arms if the registration is deleted or edited. It is the package's only task.

## Health Checks

| Check      | Displayed  | Method                                                    |
| ---------- | ---------- | --------------------------------------------------------- |
| `postgres` | "Database" | `pg_isready` against loopback                             |
| `bridge`   | "Bridge"   | `GET http://127.0.0.1:29328/_matrix/mau/ready`, 15 s grace |

The bridge answers `/ready` with 200 once it has verified the homeserver and its registration, and 5xx until then. The check reports, in order of precedence: *failure* "Synapse is not installed" when its bridge address did not resolve; *failure* "Synapse has no server name yet" when the name is unset; *loading* "Connecting to the homeserver" on a non-200, which is also what an unregistered appservice looks like; and *failure* "The bridge is not listening" when nothing answers. The daemon exiting with code 16 and `as_token was not accepted` in the log is the registration being out of date on Synapse's side: see Limitations.

## Backups and Restore

- **`db` is dumped, not copied** — a logical `pg_dump`, authenticating with the password from `store.json`.
- **`main` and `startos` are copied wholesale.** `config.yaml`, the tokens, the password and the admin list all come back.

A restored install carries the same tokens as before, so the registration already on Synapse still matches and no task is raised. Restore is complete: every user's Signal session survives, so nobody re-links.

## Limitations and Differences

1. **Re-registering does not restart Synapse.** Synapse's Register Appservice action rewrites the registration file but only restarts Synapse when the file is *new* (its path being added to `homeserver.yaml` is what triggers the restart). After a reinstall of this package, which mints new tokens, Synapse keeps the old ones in memory and the bridge exits with `as_token was not accepted` until Synapse is restarted by hand. This is a synapse-startos defect (fix proposed upstream); a first install is unaffected. The registration helper also compares tokens only, so a reinstall is the only thing that re-raises the task.
2. **Uninstalling leaves the registration on Synapse.** This package cannot remove it. Run Synapse's Delete Appservice action for `signal` afterwards.
3. **No automatic double puppeting.** It needs a second, non-exclusive appservice registration, and Synapse's Register Appservice action hard-codes `exclusive: true` on the user namespace. Manual double puppeting (`login-matrix`) works.
4. **No ephemeral events.** Typing notifications, read receipts and presence are not bridged from Matrix to Signal (see File Models).
5. **No relay mode, provisioning API, or public media.** Not exposed; the config keeps upstream's defaults (all off).
6. **`appservice.public_address` keeps the example's `https://bridge.example.com`.** It is only consulted for public media, which is off, and the bridge re-adds it on start if removed.
7. **The bridge runs as root** inside its subcontainer, unlike the image's own entrypoint, which drops to uid 1337.
8. **Logs are stdout only, at `info`.** The file writer upstream's example configures is removed at install.

---

## Quick Reference for AI Consumers

```yaml
package_id: mautrix-signal
image: dock.mau.dev/mautrix/signal:v0.2609.0 # plus postgres:16-alpine
architectures:
  - x86_64
  - aarch64
subcontainers:
  - signal-sub # daemon: bridge
  - postgres-sub # daemon: postgres
volumes:
  main: /data # config.yaml
  db: /var/lib/postgresql # PostgreSQL data
  startos: null # store.json (tokens, pg password, admins); not mounted
file_models:
  - /data/config.yaml
  - store.json # startos volume
  - /mnt/synapse/homeserver.yaml # read-only, Synapse's volume, server_name only
startos_managed_env_vars:
  - POSTGRES_USER # postgres only
  - POSTGRES_PASSWORD # postgres only
  - POSTGRES_DB # postgres only
  - POSTGRES_INITDB_ARGS # postgres only
dependencies:
  - synapse # required, running, health check `synapse`, >=1.162.0:4
interfaces: {} # none exported; port 29328 bound on the host bridge only
actions:
  - bot-info # Show Bridge Bot; read-only
  - settings # encryption, backfill, admins; restarts the service
tasks:
  - { package: synapse, action: register-appservice, severity: critical } # raised on Synapse when tokens differ
health_checks:
  - postgres # displayed "Database"
  - bridge # displayed "Bridge"
```
