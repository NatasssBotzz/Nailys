import makeWASocket from './Socket/index'

export * from '../WAProto/index.js'
export * from './Utils/index'
import * as MessageBuilder from './Utils/nixcode'
export { MessageBuilder }
export * from './Types/index'
export * from './Defaults/index'
export * from './WABinary/index'
export * from './WAM/index'
export * from './WAUSync/index'

export { default as pino } from 'pino'
export * as boom from '@hapi/boom'

export type WASocket = ReturnType<typeof makeWASocket>
export { makeWASocket }
export default makeWASocket
