import { on } from 'events'

import { aiter } from 'iterator-helper'

import logger from '../logger.js'

const log = logger(import.meta)

export default {
  /** @type {import('../index.js').Reducer} */
  reduce(state, { type, payload }) {
    if (type === 'damage') {
      const { damage } = payload
      const health = Math.max(0, state.health - damage)

      log.info({ damage, health }, 'Damage')

      return {
        ...state,
        health,
      }
    }
    return state
  },
  /** @type {import('../index.js').Observer} */
  observe({ client, events }) {
    aiter(on(events, 'state')).reduce((last_health, [{ health }]) => {
      if (last_health !== health) {
        client.write('update_health', {
          health,
          food: 20,
          foodSaturation: 0.0,
        })
      }
      return health
    }, 0)
  },
}
