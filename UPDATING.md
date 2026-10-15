# Updating the upstream version

This package wraps two prebuilt images: the bridge itself, and a PostgreSQL sidecar.

## Determining the upstream version

### mautrix-signal

Upstream publishes a release every month, tagged `v0.YYMM.0` (for example `v0.2609.0` for
September 2026), with the image at `dock.mau.dev/mautrix/signal:<tag>` for amd64 and arm64.
The binary reports itself as `vYY.MM`; the package follows the tag, not that string.

```sh
gh release view -R mautrix/signal --json tagName -q .tagName
docker manifest inspect dock.mau.dev/mautrix/signal:<tag> | jq -r '.manifests[].platform.architecture'
```

The current pin is `images.signal.source.dockerTag` in `startos/manifest/index.ts`; the package
version in `startos/versions/current.ts` is the tag without its `v`, followed by `:<revision>`.

Read the release notes (<https://github.com/mautrix/signal/releases>) and the matching
`CHANGELOG.md` before bumping: the bridge migrates its own database schema forward on start, and
a release may raise the minimum Synapse version it accepts.

### PostgreSQL

`images.postgres.source.dockerTag` pins `postgres:16-alpine`. Upstream requires PostgreSQL 16 or
newer. A major-version bump of PostgreSQL is a data migration (the on-disk format changes), so it
needs a migration in `startos/versions/`, not just a tag change; stay on 16 unless there is a
reason to move.

## Applying the bump

1. Set `images.signal.source.dockerTag` in `startos/manifest/index.ts` to the new tag, with its
   leading `v`.
2. Set `version` in `startos/versions/current.ts` to the tag without the `v` and with `:0`, and
   rewrite the release notes in every locale.
3. If the release changed the example config in a way the package enforces (compare `mautrix-signal -e`
   output against `startos/fileModels/config.yaml.ts`), update the file model.
4. `make x86` (or `make arm`), install on a StartOS box, and confirm the Bridge health check goes
   green and the bot still answers `help`.
