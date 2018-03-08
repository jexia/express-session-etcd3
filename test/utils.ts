import { defaultOptions, Etcd3StoreOptions } from '../src/express-session-etcd3'
import * as fs from 'fs'
import * as tls from 'tls'

import { Etcd3 } from 'etcd3'

const rootCertificate = fs.readFileSync(`${__dirname}/certs/certs/ca.crt`)
const tlsCert = fs.readFileSync(`${__dirname}/certs/certs/etcd0.localhost.crt`)
const tlsKey = fs.readFileSync(`${__dirname}/certs/private/etcd0.localhost.key`)
const etcdSourceAddress = process.env.ETCD_ADDR || '127.0.0.1:2379'
const [etcdSourceHost, etcdSourcePort] = etcdSourceAddress.split(':')

export const sessionData: Express.SessionData = Object.freeze({
  sid: 'test-sid',
  cookie: Object.freeze({
    originalMaxAge: 10,
    path: 'path/path',
    maxAge: 10,
    expires: true,
    httpOnly: true
  })
})
export const anotherPrefix = 'anotherPrefix'

/**
 * Returns etcd options to use for connections.
 */
export function getOptions(defaults: Partial<Etcd3StoreOptions> = {}): Etcd3StoreOptions {
  return {
    hosts: process.env.ETCD_ADDR || '127.0.0.1:2379',
    credentials: { rootCertificate },
    ...defaults
  }
}

/**
 * Creates an etcd client with the default options and seeds some keys.
 */
export function createTestClientAndKeys(
  defaults: Partial<Etcd3StoreOptions> = {},
  initData: [string, any][] = []
): Promise<Etcd3> {
  const client = new Etcd3(getOptions(defaults))
  return Promise.all([
    client.put(defaultOptions.prefix + '/' + sessionData.sid).value(JSON.stringify(sessionData)),
    client.put(anotherPrefix + '/' + sessionData.sid).value(JSON.stringify(sessionData)),
    ...initData.map(([key, value]) => client.put(key).value(value))
  ]).then(() => client)
}

/**
 * Destroys the etcd client and wipes all keys.
 */
export async function tearDownTestClient(client: Etcd3) {
  if (!client) return
  await client.delete().all()
  client.close()
}
