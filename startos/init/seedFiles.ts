import { utils } from '@start9labs/start-sdk'
import { configYaml, stdoutWriter } from '../fileModels/config.yaml'
import { storeJson } from '../fileModels/store.json'
import { sdk } from '../sdk'
import { bridgeBinary, configPath, mount } from '../utils'

const token = () => utils.getDefaultString({ charset: 'a-z,A-Z,0-9', len: 64 })

export const seedFiles = sdk.setupOnInit(async (effects, kind) => {
  if (kind === 'install') {
    await storeJson.merge(effects, {
      asToken: token(),
      hsToken: token(),
      pgPassword: utils.getDefaultString({ charset: 'a-z,A-Z,0-9', len: 22 }),
      senderLocalpart: `signal-as-${utils.getDefaultString({ charset: 'a-z,0-9', len: 16 })}`,
    })

    // Let the bridge write its own example config, so every upstream key is
    // present with upstream's default and only the modeled keys are ours.
    await sdk.SubContainer.withTemp(
      effects,
      { imageId: 'signal' },
      mount,
      'gen-config',
      (subc) => subc.execFail([bridgeBinary, '-c', configPath, '-e']),
    )

    // Package defaults that differ from the example. A schema `.catch()` only
    // replaces an invalid value, and these example values are valid, so they
    // are set here, once, and are the user's from then on.
    await configYaml.merge(effects, {
      // Element and most clients encrypt new direct chats; a bridge that
      // cannot read them is broken on first use.
      encryption: { allow: true },
      // The example logs at debug to a file as well as stdout.
      logging: { min_level: 'info', writers: [stdoutWriter] },
      // The example ships placeholder entries for a second homeserver's
      // double puppeting; none of it applies here.
      double_puppet: {
        servers: { 'anotherserver.example.org': undefined },
        secrets: { 'example.com': undefined },
      },
    })
  }

  await storeJson.merge(effects, {})
  await configYaml.merge(effects, {})
})
