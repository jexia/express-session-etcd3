import { Store } from 'express-session'
import { Etcd3, IOptions } from 'etcd3'
import debug from 'debug'

/**
 * One day in seconds.
 */
export const oneDay = 86400

/**
 * Max TTL time to leasing on ETCD3 Client in seconds.
 */
export const maxTTL = 6442450

/**
 * Configuration options for the etcd v3
 */
export interface Etcd3StoreOptions extends IOptions {
  /**
   * Prefix used to record the keys of all the sessions.
   *
   * Defaults to `sess`.
   */
  prefix?: string
  /**
   * Option to skip touching process that express does every time it reads the session.
   * This is useful if you work with big TTL and wanna free your ETCD from this extra access.
   *
   * Defaults to `false`.
   */
  skipTouch?: boolean
}

/**
 * Default configuration values for the etcd v3 options
 */
export const defaultOptions: Etcd3StoreOptions = Object.freeze({
  prefix: 'sess',
  hosts: '127.0.0.1:2379',
  skipTouch: false
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
export default class Etcd3Store extends Store {
  private debug = debug('express-session:etcd3')

  constructor(
    private config: Etcd3StoreOptions = defaultOptions,
    private client = new Etcd3(config)
  ) {
    super(config)
    this.debug('init config: %O', config)
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
    this.debug('GET "%s"', sid)
    try {
      this.client
        .get(this.key(sid))
        .json()
        .then(
          val => this.callbackWithLog(callback, null, val),
          err => this.callbackWithLog(callback, err)
        )
    } catch (err) {
      this.callbackWithLog(callback, err)
    }
  }

  /**
   * This required method is used to upsert a session into the store given a
   * session ID (`sid`) and session (`session`) object. The callback should be
   * called as `callback(error)` once the session has been set in the store.
   */
  set = (sid: string, session: Express.SessionData, callback: (err: any) => void): void => {
    const ttl = this.getTTL(session, sid)
    this.debug('SET "%s" ttl:%s %O', sid, ttl, session)
    try {
      const leasing = this.client.lease(ttl)
      leasing
        .put(this.key(sid))
        .value(JSON.stringify(session))
        .then(
          () => {
            leasing.release()
            this.callbackWithLog(callback)
          },
          err => this.callbackWithLog(callback, err)
        )
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
    if (this.config.skipTouch) {
      this.debug('SKIP TOUCH "%s"', sid)
      callback(null)
      return
    }
    this.debug('TOUCH "%s" %O', sid, session)
    this.set(sid, session, callback)
  }

  /**
   * This method is used to get all sessions in the store as an array. The
   * `callback` should be called as `callback(error, sessions)`.
   */
  all = (callback: (err: any, obj: { [sid: string]: Express.SessionData }) => void): void => {
    this.debug('ALL')
    try {
      this.client
        .getAll()
        .prefix(this.key())
        .json()
        .then(json => Object.values(json))
        .then(
          val => this.callbackWithLog(callback, null, val),
          err => this.callbackWithLog(callback, err)
        )
    } catch (err) {
      this.callbackWithLog(callback, err)
    }
  }

  /**
   * This method is used to get the count of all sessions in the store.
   * The `callback` should be called as `callback(error, len)`.
   */
  length = (callback: (err: any, length: number) => void): void => {
    this.debug('LENGTH')
    try {
      this.client
        .getAll()
        .prefix(this.key())
        .count()
        .then(
          val => this.callbackWithLog(callback, null, val),
          err => this.callbackWithLog(callback, err)
        )
    } catch (err) {
      this.callbackWithLog(callback, err)
    }
  }

  /**
   * This method is used to destroy/delete a session from the store given
   * a session ID (`sid`). The `callback` should be called as `callback(error)`
   * once the session is destroyed.
   */
  destroy = (sid: string, callback: (err: any) => void): void => {
    this.debug('DESTROY')
    try {
      this.client
        .delete()
        .prefix(this.key(sid))
        .then(() => this.callbackWithLog(callback), err => this.callbackWithLog(callback, err))
    } catch (err) {
      callback(err)
    }
  }

  /**
   * This method is used to delete all sessions from the store. The `callback`
   * should be called as `callback(error)` once the store is cleared.
   */
  clear = (callback: (err: any) => void): void => {
    this.debug('CLEAR')
    try {
      this.client
        .delete()
        .prefix(this.key())
        .then(() => this.callbackWithLog(callback), err => this.callbackWithLog(callback, err))
    } catch (err) {
      this.callbackWithLog(callback, err)
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
    const rawTTL = this.getRawTTL(sess, sid)
    return rawTTL > maxTTL ? maxTTL : rawTTL
  }

  /**
   * Get the raw Time to Live (`ttl`) of the session from the data sources
   */
  private getRawTTL(sess: Express.SessionData, sid: string): number {
    const storeTtl: any = (this as any)['ttl']
    if (typeof storeTtl === 'number') return storeTtl
    if (typeof storeTtl === 'string') return Number(storeTtl)
    if (typeof storeTtl === 'function') return storeTtl(this, sess, sid)
    if (storeTtl) throw new TypeError('`store.ttl` must be a number or function.')

    const maxAge = sess.cookie.maxAge
    return typeof maxAge === 'number' ? Math.floor(maxAge / 1000) : oneDay
  }

  /**
   * Logging callback result
   */
  private callbackWithLog(cb: Function, err: any = null, value: any = null) {
    const log = err ? ['ERR %O', err] : value ? ['DONE, data: %O', value] : ['DONE']
    this.debug(log.shift(), ...log)
    cb(err, value)
  }
}
