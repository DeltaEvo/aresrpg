import { readFileSync } from 'fs'

import { GraphQLClient } from 'graphql-request'
import { parse } from 'graphql/index.mjs'

const {
  ENJIN_ENDPOINT = 'https://kovan.cloud.enjin.io/graphql',
  ACCESS_TOKEN,
  // APP_SECRET,
  // APP_ID,
} = process.env

const client = new GraphQLClient(ENJIN_ENDPOINT)
const import_query = (path) => {
  const file = readFileSync(path, 'utf-8')
  return parse(file, { noLocation: true })
}

const Queries = {
  create_player: import_query('./src/enjin/create_player.gql'),
  login_player: import_query('./src/enjin/login_player.gql'),
  get_identity: import_query('./src/enjin/get_identity.gql'),
  get_player: import_query('./src/enjin/get_player.gql'),
}

client.setHeader('authorization', ACCESS_TOKEN)

// const authenticate_app = async () => {
//   return client.request(
//     gql`
//       query RetrieveAppAccessToken($appId: Int!, $appSecret: String!) {
//         AuthApp(id: $appId, secret: $appSecret) {
//           accessToken
//           expiresIn
//         }
//       }
//     `,
//     {
//       appId: APP_ID,
//       appSecret: APP_SECRET,
//     }
//   )
// }

const sceat_id = 9527

// console.dir(await client.request(Queries.get_identity), { depth: Infinity })
console.dir(
  /* await */ client.request(Queries.get_identity, { id: sceat_id }),
  {
    depth: Infinity,
  }
)
