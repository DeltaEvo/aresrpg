import { on } from 'events'
import { performance } from 'perf_hooks'

import { aiter } from 'iterator-helper'

import { chunk_position, same_chunk } from '../chunk.js'
import { position_equal } from '../position.js'
import {
  sort_by_distance,
  square_difference,
  square_symmetric_difference,
} from '../math.js'
import { PLAYER_ENTITY_ID } from '../index.js'

function fix_light(chunk) {
  for (let x = 0; x < 16; x++) {
    for (let z = 0; z < 16; z++) {
      for (let y = 0; y < 256; y++) {
        chunk.setSkyLight({ x, y, z }, 15)
        chunk.setBlockLight({ x, y, z }, 15)
      }
    }
  }
}

async function load_chunk({ client, world, x, z }) {
  performance.mark('load_chunk_start')
  const chunk = await world.chunks.load(x, z)

  fix_light(chunk) // TODO: replace this with a proper fix

  client.write('update_light', {
    chunkX: x,
    chunkZ: z,
    trustEdges: true,
    skyLightMask: chunk.skyLightMask,
    blockLightMask: chunk.blockLightMask,
    emptySkyLightMask: 0,
    emptyBlockLightMask: 0,
    data: chunk.dumpLight(),
  })
  client.write('map_chunk', {
    x,
    z,
    groundUp: true,
    bitMap: chunk.getMask(),
    biomes: chunk.dumpBiomes(),
    ignoreOldData: true,
    heightmaps: {
      type: 'compound',
      name: '',
      value: {
        MOTION_BLOCKING: {
          type: 'longArray',
          value: new Array(36).fill([256, 256]),
        },
      },
    }, // FIXME: fake heightmap
    chunkData: chunk.dump(),
    blockEntities: [],
  })
  performance.mark('load_chunk_end')
  performance.measure('load_chunk', 'load_chunk_start', 'load_chunk_end')
}

function unload_chunk({ client, x, z }) {
  client.write('unload_chunk', {
    chunkX: x,
    chunkZ: z,
  })
}

export async function load_chunks(state, { client, events, world, chunks }) {
  const points = chunks.map(({ x, z }) => ({ x, y: z }))
  const sorted = sort_by_distance(
    {
      x: chunk_position(state.position.x),
      y: chunk_position(state.position.z),
    },
    points
  )
  for (const { x, y } of sorted) {
    await load_chunk({ client, world, x, z: y })
    events.emit('chunk_loaded', { x, z: y })

    // Loading one chunk is cpu intensive, wait for next tick to avoid
    // starving the event loop for too long
    await new Promise((resolve) => process.nextTick(resolve))
  }
}

export function unload_chunks(state, { client, events, chunks, world }) {
  for (const chunk of chunks) {
    events.emit('chunk_unloaded', chunk)
    unload_chunk({ client, world, ...chunk })
  }
}

export default {
  /** @type {import('../index.js').Reducer} */
  reduce(state, { type, payload }) {
    if (type === 'teleport') {
      return {
        ...state,
        teleport: payload,
      }
    }
    if (position_equal(state.position, state.teleport)) {
      return {
        ...state,
        teleport: null,
      }
    }
    return state
  },
  /** @type {import('../index.js').Observer} */
  observe({ client, events, world }) {
    aiter(on(events, 'state'))
      .map(([{ position, view_distance, teleport }]) => ({
        position,
        view_distance,
        teleport,
      }))
      .reduce(async (last_state, state) => {
        if (
          state.teleport !== null &&
          !position_equal(last_state.teleport, state.teleport)
        ) {
          const chunk = {
            x: chunk_position(state.teleport.x),
            z: chunk_position(state.teleport.z),
          }

          client.write('update_view_position', {
            chunkX: chunk.x,
            chunkZ: chunk.z,
          })

          await load_chunk({ client, world, x: chunk.x, z: chunk.z }) // TODO kick player on error ?

          client.write('position', {
            entityId: PLAYER_ENTITY_ID,
            yaw: 0,
            pitch: 0,
            teleportId: 0,
            ...state.teleport,
            onGround: true,
          })
        }

        if (!same_chunk(last_state.position, state.position)) {
          const { a: points_to_unload, b: points_to_load } =
            square_symmetric_difference(
              {
                x: chunk_position(last_state.position.x),
                y: chunk_position(last_state.position.z),
              },
              {
                x: chunk_position(state.position.x),
                y: chunk_position(state.position.z),
              },
              state.view_distance
            )

          client.write('update_view_position', {
            chunkX: chunk_position(state.position.x),
            chunkZ: chunk_position(state.position.z),
          })

          const to_unload = points_to_unload.map(({ x, y }) => ({ x, z: y }))
          unload_chunks(state, { client, events, world, chunks: to_unload })

          const to_load = points_to_load.map(({ x, y }) => ({ x, z: y }))
          await load_chunks(state, { client, events, world, chunks: to_load }) // TODO kick player on error ?
        }

        if (last_state.view_distance !== state.view_distance) {
          const chunk_point = {
            x: chunk_position(state.position.x),
            y: chunk_position(state.position.z),
          }
          const points = square_difference(
            chunk_point,
            last_state.view_distance,
            state.view_distance
          )
          const chunks = points.map(({ x, y }) => ({ x, z: y }))

          client.write('update_view_distance', {
            viewDistance: state.view_distance,
          })

          const action =
            state.view_distance > last_state.view_distance
              ? load_chunks
              : unload_chunks

          await action(state, { client, world, events, chunks })
        }

        return state
      })
  },
}
