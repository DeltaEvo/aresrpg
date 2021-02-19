import { Events, sources } from './pusher.js'

export default {
  sources,

  reducer(state, { type, payload }) {
    switch (type) {
      case Events.TOKEN_TRANSFERRED:
        // this listen to any token transfer on the server
        // there is a way on pusher to only subscribe to a specific wallet
        // either we listen on the app scope and we push the event to everyone
        // then we filter in the reducer to make sur the transfer is about the current user
        // or we create a subscription per user that we initiate when he login
        break
    }

    return state
  },
}
