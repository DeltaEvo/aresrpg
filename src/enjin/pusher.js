import events from 'events'

import Pusher from 'pusher-js'

import Queries from './graphql/index.js'

const Events = {
  APP_CREATED: 'EnjinCloud\\Events\\AppCreated',
  APP_DELETED: 'EnjinCloud\\Events\\AppDeleted',
  APP_LINKED: 'EnjinCloud\\Events\\AppLinked',
  APP_LOCKED: 'EnjinCloud\\Events\\AppLocked',
  APP_UNLINKED: 'EnjinCloud\\Events\\AppUnlinked',
  APP_UNLOCKED: 'EnjinCloud\\Events\\AppUnlocked',
  APP_UPDATED: 'EnjinCloud\\Events\\AppUpdated',
  BLOCKCHAIN_LOG_PROCESSED: 'EnjinCloud\\Events\\BlockchainLogProcessed',
  IDENTITY_CREATED: 'EnjinCloud\\Events\\IdentityCreated',
  IDENTITY_DELETED: 'EnjinCloud\\Events\\IdentityDeleted',
  IDENTITY_LINKED: 'EnjinCloud\\Events\\IdentityLinked',
  IDENTITY_UNLINKED: 'EnjinCloud\\Events\\IdentityUnlinked',
  IDENTITY_UPDATED: 'EnjinCloud\\Events\\IdentityUpdated',
  MESSAGE_PROCESSED: 'EnjinCloud\\Events\\MessageProcessed',
  TOKEN_CREATED: 'EnjinCloud\\Events\\TokenCreated',
  TOKEN_MELTED: 'EnjinCloud\\Events\\TokenMelted',
  TOKEN_MINTED: 'EnjinCloud\\Events\\TokenMinted',
  TOKEN_TRANSFERRED: 'EnjinCloud\\Events\\TokenTransferred',
  TOKEN_UPDATED: 'EnjinCloud\\Events\\TokenUpdated',
  TRADE_COMPLETED: 'EnjinCloud\\Events\\TradeCompleted',
  TRADE_CREATED: 'EnjinCloud\\Events\\TradeCreated',
  TRANSACTION_BROADCAST: 'EnjinCloud\\Events\\TransactionBroadcast',
  TRANSACTION_CANCELED: 'EnjinCloud\\Events\\TransactionCanceled',
  TRANSACTION_DROPPED: 'EnjinCloud\\Events\\TransactionDropped',
  TRANSACTION_EXECUTED: 'EnjinCloud\\Events\\TransactionExecuted',
  TRANSACTION_FAILED: 'EnjinCloud\\Events\\TransactionFailed',
  TRANSACTION_PENDING: 'EnjinCloud\\Events\\TransactionPending',
  TRANSACTION_PROCESSING: 'EnjinCloud\\Events\\TransactionProcessing',
  TRANSACTION_UPDATED: 'EnjinCloud\\Events\\TransactionUpdated',
}

const { APP_ID } = process.env
const {
  Platform: {
    notifications: {
      pusher: {
        key,
        channels: { app /* identity, token, user, wallet */ },
        options: { cluster },
      },
    },
  },
} = await Queries.pusher()

const emitter = new events.EventEmitter()
const pusher = new Pusher(key, { cluster })

const Channels = {
  app: pusher.subscribe(app.replace('{id}', APP_ID)),
}

function yield_events(event, channel) {
  channel.bind(event, (value) => emitter.emit(event, value))
  return events.on(emitter, event)
}

const sources = [
  yield_events(Events.TOKEN_MINTED, Channels.app),
  yield_events(Events.TOKEN_TRANSFERRED, Channels.app),
]

export { Events, sources }
