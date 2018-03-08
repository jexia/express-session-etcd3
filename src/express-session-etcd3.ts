import * as session from 'express-session'
import { Etcd3, IOptions } from 'etcd3'

/**
 * One day in seconds.
 */
export const oneDay = 86400

/**
 * Configuration options for the etcd v3
 */
export interface Etcd3StoreOptions extends IOptions {
  /**
   * Prefix used to record the keys of all the sessions
   *
   * Defaults to `sess`.
   */
  prefix?: string
}

/**
 * Default configuration values for the etcd v3 options
 */
export const defaultOptions: Etcd3StoreOptions = Object.freeze({
  prefix: 'sess',
  hosts: '127.0.0.1:2379'
})

/**
 * An etcd v3 store adapter for Express session using [etcd3](https://github.com/mixer/etcd3) client.
 *
 * ```
 * var session = require('express-session');
 * var Etcd3Store = require('express-session-etcd3');
 *
 * app.use(session({
 *     store: new Etcd3Store(options),
 *     secret: 'keyboard cat',
 *     resave: false
 * }));
 * ```
 */
export default class Etcd3Store extends session.Store {
  constructor(
    private config: Etcd3StoreOptions = defaultOptions,
    private client = new Etcd3(config)
  ) {
    super(config)
  }

  /**
   * This method is used to get a session from the store given a session
   * ID (`sid`). The `callback` should be called as `callback(error, session)`.
   *
   * The `session` argument should be a session if found, otherwise `null` or
   * `undefined` if the session was not found (and there was no error). A special
   * case is made when `error.code === 'ENOENT'` to act like `callback(null, null)`.
   */
  get = (sid: string, callback: (err: any, session: Express.SessionData) => void): void => {
    try {
      this.client
        .get(this.key(sid))
        .json()
        .then((val: any) => callback(null, val), err => callback(err, null as any))
    } catch (err) {
      callback(err, null as any)
    }
  }

  /**
   * This required method is used to upsert a session into the store given a
   * session ID (`sid`) and session (`session`) object. The callback should be
   * called as `callback(error)` once the session has been set in the store.
   */
  set = (sid: string, session: Express.SessionData, callback: (err: any) => void): void => {
    try {
      const lease = this.client
        .lease(this.getTTL(session, sid))
        .put(this.key(sid))
        .value(JSON.stringify(session))
        .then(() => callback(null), err => callback(err))
    } catch (err) {
      callback(err)
    }
  }

  /**
   * This method is used to "touch" a given session given a
   * session ID (`sid`) and session (`session`) object. The `callback` should be
   * called as `callback(error)` once the session has been touched.
   *
   * This is primarily used when the store will automatically delete idle sessions
   * and this method is used to signal to the store the given session is active,
   * potentially resetting the idle timer.
   */
  touch = (sid: string, session: Express.SessionData, callback: (err: any) => void): void => {
    this.set(sid, session, callback)
  }

  /**
   * This method is used to get all sessions in the store as an array. The
   * `callback` should be called as `callback(error, sessions)`.
   */
  all = (callback: (err: any, obj: { [sid: string]: Express.SessionData }) => void): void => {
    try {
      this.client
        .getAll()
        .prefix(this.key())
        .json()
        .then(json => Object.values(json))
        .then((val: any) => callback(null, val), err => callback(err, null as any))
    } catch (err) {
      callback(err, null as any)
    }
  }

  /**
   * This method is used to get the count of all sessions in the store.
   * The `callback` should be called as `callback(error, len)`.
   */
  length = (callback: (err: any, length: number) => void): void => {
    try {
      this.client
        .getAll()
        .prefix(this.key())
        .count()
        .then(val => callback(null, val), err => callback(err, null as any))
    } catch (err) {
      callback(err, null as any)
    }
  }

  /**
   * This method is used to destroy/delete a session from the store given
   * a session ID (`sid`). The `callback` should be called as `callback(error)`
   * once the session is destroyed.
   */
  destroy = (sid: string, callback: (err: any) => void): void => {
    try {
      this.client
        .delete()
        .prefix(this.key(sid))
        .then(() => callback(null), err => callback(err))
    } catch (err) {
      callback(err)
    }
  }

  /**
   * This method is used to delete all sessions from the store. The `callback`
   * should be called as `callback(error)` once the store is cleared.
   */
  clear = (callback: (err: any) => void): void => {
    try {
      this.client
        .delete()
        .prefix(this.key())
        .then(() => callback(null), err => callback(err))
    } catch (err) {
      callback(err)
    }
  }

  /**
   * Build the etcd key with the right prefix and the givin session ID (`sid`)
   */
  private key(sid = ''): string {
    return (this.config.prefix || defaultOptions.prefix) + '/' + sid
  }

  /**
   * Get the Time to Live (`ttl`) of the session
   */
  private getTTL(sess: Express.SessionData, sid: string): number {
    const storeTtl: any = (this as any)['ttl']
    if (typeof storeTtl === 'number') return storeTtl
    if (typeof storeTtl === 'string') return Number(storeTtl)
    if (typeof storeTtl === 'function') return storeTtl(this, sess, sid)
    if (storeTtl) throw new TypeError('`store.ttl` must be a number or function.')

    const maxAge = sess.cookie.maxAge
    return typeof maxAge === 'number' ? Math.floor(maxAge / 1000) : oneDay
  }
}
