import { sdk } from '../sdk'
import { botInfo } from './botInfo'
import { settings } from './settings'

export const actions = sdk.Actions.of().addAction(botInfo).addAction(settings)
