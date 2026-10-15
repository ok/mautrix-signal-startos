import { storeJson } from './fileModels/store.json'
import { sdk } from './sdk'
import { postgresDb, postgresMountpoint, postgresUser } from './utils'

export const { createBackup, restoreInit } = sdk.setupBackups(async () =>
  sdk.Backups.withPgDump({
    imageId: 'postgres',
    dbVolume: 'db',
    mountpoint: postgresMountpoint,
    pgdataPath: '/data',
    database: postgresDb,
    user: postgresUser,
    password: async () => {
      const password = await storeJson.read((s) => s.pgPassword).once()
      if (!password) throw new Error('store.json has no pgPassword')
      return password
    },
  })
    .addVolume('main')
    .addVolume('startos'),
)
