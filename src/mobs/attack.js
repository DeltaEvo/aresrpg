import { on } from 'events'

import { aiter } from 'iterator-helper'

import { Types } from './types.js'

export default {
  /** @type {import('../index.js').Observer} */
  observe({ client, world, dispatch }) {
    for (const mob of world.mobs.all) {
      aiter(on(mob.events, 'state')).reduce(
        (last_attack_sequence_number, [{ attack_sequence_number, target }]) => {
          if (
            target === client.uuid &&
            attack_sequence_number !== last_attack_sequence_number
          ) {
            dispatch('damage', { damage: Types[mob.mob].damage })
          }
          return attack_sequence_number
        },
        null
      )
    }
  },
}
