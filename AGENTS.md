# AGENTS.md

This is a StartOS service-package repository — it builds a `.s9pk` for StartOS.

Develop it inside a StartOS packaging workspace created by `start-cli s9pk init-workspace`,
which provides the packaging guide and agent context one level up. If you're reading this in a
bare clone with no workspace, the full guide is at <https://docs.start9.com/packaging>.

- **The repo's base branch is `main`**, and the workflows say so. Don't "fix" them back to `master`.
- **Don't change `appserviceId`, `botLocalpart` or `usernameTemplate` in `startos/utils.ts`.** Synapse's registration file and every ghost user the bridge has created carry them; a change orphans existing portal rooms and leaves a stale registration on Synapse.
- **`config.yaml` package defaults that differ from upstream's example go in the install branch of `startos/init/seedFiles.ts`, not in a `.catch()`.** The file is seeded from the example the bridge generates, and a `.catch()` only replaces an *invalid* value — an example value that is valid but unwanted stays unless written explicitly.
- **Synapse's code is an npm git dependency pinned at `#next`.** `npm update` does not refresh it; delete its entries from `package-lock.json` and run `npm install` (twice). The registration helper, host id and port imported from it are the contract — see `startos/utils.ts`.
