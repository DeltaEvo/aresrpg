import Pusher from './pusher.js'

export default {
  sources: [Pusher.on_token_minted],

  reducer(state, { type, payload }) {},
}
