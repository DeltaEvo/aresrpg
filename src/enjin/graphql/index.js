import { readFileSync } from 'fs'

import { GraphQLClient } from 'graphql-request'
import { parse } from 'graphql/index.mjs'

import logger from '../../logger.js'

const {
  ENJIN_ENDPOINT = 'https://kovan.cloud.enjin.io/graphql',
  APP_SECRET,
  APP_ID,
} = process.env

const log = logger(import.meta)
const client = new GraphQLClient(ENJIN_ENDPOINT)
const import_query = (path) => {
  const file = readFileSync(`./src/enjin/graphql/${path}.gql`, 'utf-8')
  const document = parse(file, { noLocation: true })
  return (variables) => client.request(document, variables)
}

const Queries = {
  authenticate: import_query('authenticate'),
  create_player: import_query('create_player'),
  login_player: import_query('login_player'),
  get_identity: import_query('get_identity'),
  get_player: import_query('get_player'),
  pusher: import_query('pusher'),
  mint_fungible_tokens: import_query('mint_fungible_tokens'),
}

const {
  AuthApp: { accessToken },
} = await Queries.authenticate({
  appId: APP_ID,
  appSecret: APP_SECRET,
})

client.setHeader('authorization', accessToken)

log.trace({ authenticated: true }, 'connected to Enjin cloud')

export default Queries
