import { DeleteBuilder, MultiRangeBuilder, SingleRangeBuilder } from 'etcd3/lib/src'
import Etcd3Store, { Etcd3StoreOptions, defaultOptions, oneDay } from '../src/express-session-etcd3'
import { Etcd3 } from 'etcd3'
import { PutBuilder } from 'etcd3/lib/src/builder'
import { anotherPrefix, createTestClientAndKeys, sessionData, tearDownTestClient } from './utils'

describe('Etcd3Store test suit', () => {
  let client: Etcd3
  const newSid = 'newTestSid'

  async function createSubject(
    options: Partial<Etcd3StoreOptions> = undefined,
    initData: [string, any][] = []
  ) {
    client = await createTestClientAndKeys(options, initData)
    return {
      client,
      subject: new Etcd3Store(options as any, client)
    }
  }

  afterEach(() => tearDownTestClient(client))

  it('should work with a personal config', () => {
    const subject = new Etcd3Store({ hosts: 'myhost' }, {} as any)
    expect(subject['key']()).toBeTruthy()
  })

  it('should work with a default client instance', () => {
    const options = { hosts: 'myhost' }
    const subject = new Etcd3Store(options)
    expect(subject['client']).toBeTruthy()
    expect(subject['client']['pool']['options']).toBe(options)
    tearDownTestClient(subject['client'])
  })

  describe('when getting the session data', () => {
    it('should return with the json of an existing sid with default prefix', async done => {
      const { subject } = await createSubject()
      subject.get(sessionData.sid, (err, data) => {
        expect(err).toBeNull()
        expect(data).toEqual(sessionData)
        done()
      })
    })

    it('should return with the json of an existing sid with another prefix', async done => {
      const { subject } = await createSubject({ prefix: anotherPrefix })
      subject.get(sessionData.sid, (err, data) => {
        expect(err).toBeNull()
        expect(data).toEqual(sessionData)
        done()
      })
    })

    it('should return null for a non existing sid', async done => {
      const { subject } = await createSubject()
      subject.get('non existing sid', (err, data) => {
        expect(err).toBeNull()
        expect(data).toBeNull()
        done()
      })
    })

    it('should return an error if the there is a bad data at the sid', async done => {
      const { subject, client } = await createSubject()
      const badSid = 'badSid'
      client.put(defaultOptions.prefix + '/' + badSid).value('typo{b:1}')
      subject.get(badSid, (err, data) => {
        expect(err).toBeDefined()
        expect(data).toBeNull()
        done()
      })
    })

    it('should return an error at the callback if the client blow up', async done => {
      const { subject, client } = await createSubject()
      jest.spyOn(client, 'get').mockImplementation(() => {
        throw new Error()
      })
      subject.get(sessionData.sid, (err, data) => {
        expect(err).toBeInstanceOf(Error)
        expect(data).toBeNull()
        done()
      })
    })

    it('should return an error at the callback if the client return an rejected promise', async done => {
      const { subject } = await createSubject()
      jest
        .spyOn(SingleRangeBuilder.prototype, 'json')
        .mockReturnValueOnce(Promise.reject('any rejection'))
      subject.get(sessionData.sid, err => {
        expect(err).toBeTruthy()
        done()
      })
    })
  })

  describe('when setting session data', () => {
    it('should put the json with default prefix', async done => {
      const { subject } = await createSubject()
      jest.spyOn(subject, 'getTTL' as any).mockReturnValue(100)
      subject.set(newSid, sessionData, err => {
        expect(err).toBeNull()
        client
          .get(defaultOptions.prefix + '/' + newSid)
          .json()
          .then(data => {
            expect(data).toEqual(sessionData)
            done()
          })
      })
    })

    it('should put the json with another prefix', async done => {
      const { subject } = await createSubject({ prefix: anotherPrefix })
      jest.spyOn(subject, 'getTTL' as any).mockReturnValue(100)
      subject.set(newSid, sessionData, err => {
        expect(err).toBeNull()
        client
          .get(anotherPrefix + '/' + newSid)
          .json()
          .then(data => {
            expect(data).toEqual(sessionData)
            done()
          })
      })
    })

    it('should lease the session with the giving ttl', async done => {
      const { subject } = await createSubject({ prefix: anotherPrefix })
      const ttl = 1
      jest.spyOn(subject, 'getTTL' as any).mockReturnValue(ttl)
      jest.spyOn(client, 'lease')
      subject.set(newSid, sessionData, err => {
        expect(err).toBeNull()
        expect(client.lease).toHaveBeenCalledWith(ttl)
        client
          .get(anotherPrefix + '/' + newSid)
          .exec()
          .then(data => {
            expect(data.kvs[0]).toBeTruthy()
            done()
          })
      })
    })

    it('should return an error at the callback if the client blow up', async done => {
      const { subject, client } = await createSubject()
      jest.spyOn(client, 'put').mockImplementation(() => {
        throw new Error()
      })
      subject.set(sessionData.sid, sessionData, err => {
        expect(err).toBeInstanceOf(Error)
        done()
      })
    })

    it('should return an error at the callback if the client return an rejected promise', async done => {
      const { subject } = await createSubject()
      jest.spyOn(subject, 'getTTL' as any).mockReturnValue(100)
      jest.spyOn(PutBuilder.prototype, 'value').mockReturnValueOnce(Promise.reject('any rejection'))
      subject.set(sessionData.sid, sessionData, err => {
        expect(err).toBeTruthy()
        done()
      })
    })
  })

  describe('when touching session data', () => {
    it('should set it again', async () => {
      const { subject, client } = await createSubject()
      jest.spyOn(subject, 'set').mockImplementation(jest.fn())
      const callback = jest.fn()
      subject.touch(sessionData.sid, sessionData, callback)
      expect(subject.set).toHaveBeenCalledWith(sessionData.sid, sessionData, callback)
    })
  })

  describe('when getting all the sessions', () => {
    it('should return with the json of all sessions data with default prefix', async done => {
      const { subject } = await createSubject()
      subject.all((err, data) => {
        expect(err).toBeNull()
        expect(data).toEqual([sessionData])
        done()
      })
    })

    it('should return with the json of all sessions data with another prefix', async done => {
      const { subject } = await createSubject({ prefix: anotherPrefix })
      subject.all((err, data) => {
        expect(err).toBeNull()
        expect(data).toEqual([sessionData])
        done()
      })
    })

    it('should return an empty array if there is no sessions at the used prefix', async done => {
      const { subject } = await createSubject({ prefix: 'emptyprefix' })
      subject.all((err, data) => {
        expect(err).toBeNull()
        expect(data).toEqual([])
        done()
      })
    })

    it('should return an error if the there is a bad data at the used prefix', async done => {
      const { subject } = await createSubject()
      await client.put(defaultOptions.prefix + '/badSid').value('typo{b:1}')
      subject.all((err, data) => {
        expect(err).toBeDefined()
        expect(data).toBeNull()
        done()
      })
    })

    it('should return an error at the callback if the client blow up', async done => {
      const { subject, client } = await createSubject()
      jest.spyOn(client, 'getAll').mockImplementation(() => {
        throw new Error()
      })
      subject.all((err, data) => {
        expect(err).toBeInstanceOf(Error)
        expect(data).toBeNull()
        done()
      })
    })
  })

  describe('when counting the sessions', () => {
    it('should count the sessions data with default prefix', async done => {
      const { subject } = await createSubject()
      subject.length((err, data) => {
        expect(err).toBeNull()
        expect(data).toEqual(1)
        done()
      })
    })

    it('should count the sessions data with another prefix', async done => {
      const { subject } = await createSubject({ prefix: anotherPrefix })
      subject.length((err, data) => {
        expect(err).toBeNull()
        expect(data).toEqual(1)
        done()
      })
    })

    it('should return zero if there is no sessions at the used prefix', async done => {
      const { subject } = await createSubject({ prefix: 'emptyprefix' })
      subject.length((err, data) => {
        expect(err).toBeNull()
        expect(data).toEqual(0)
        done()
      })
    })

    it('should return an error at the callback if the client blow up', async done => {
      const { subject, client } = await createSubject()
      jest.spyOn(client, 'getAll').mockImplementation(() => {
        throw new Error()
      })
      subject.length((err, data) => {
        expect(err).toBeInstanceOf(Error)
        expect(data).toBeNull()
        done()
      })
    })

    it('should return an error at the callback if the client return an rejected promise', async done => {
      const { subject } = await createSubject()
      jest
        .spyOn(MultiRangeBuilder.prototype, 'count')
        .mockReturnValueOnce(Promise.reject('any rejection'))
      subject.length(err => {
        expect(err).toBeTruthy()
        done()
      })
    })
  })

  describe('when destroying a session', () => {
    it('should destroy a session data with default prefix', async done => {
      const { subject, client } = await createSubject()
      const key = defaultOptions.prefix + '/' + sessionData.sid
      expect(await client.get(key)).toBeTruthy()
      subject.destroy(sessionData.sid, err => {
        expect(err).toBeNull()
        client.get(key).then(data => {
          expect(data).toBeNull()
          done()
        })
      })
    })

    it('should destroy a session data with another prefix', async done => {
      const { subject, client } = await createSubject({ prefix: anotherPrefix })
      const key = anotherPrefix + '/' + sessionData.sid
      expect(await client.get(key)).toBeTruthy()
      subject.destroy(sessionData.sid, err => {
        expect(err).toBeNull()
        client.get(key).then(data => {
          expect(data).toBeNull()
          done()
        })
      })
    })

    it('should return an error at the callback if the client blow up', async done => {
      const { subject, client } = await createSubject()
      jest.spyOn(client, 'delete').mockImplementationOnce(() => {
        throw new Error()
      })
      subject.destroy(sessionData.sid, err => {
        expect(err).toBeInstanceOf(Error)
        done()
      })
    })

    it('should return an error at the callback if the client return an rejected promise', async done => {
      const { subject } = await createSubject()
      jest
        .spyOn(DeleteBuilder.prototype, 'prefix')
        .mockReturnValueOnce(Promise.reject('any rejection'))
      subject.destroy(sessionData.sid, err => {
        expect(err).toBeTruthy()
        done()
      })
    })
  })

  describe('when clearing all the sessions', () => {
    it('should clear all the sessions data with default prefix', async done => {
      const { subject, client } = await createSubject()
      const initCount = await client
        .getAll()
        .prefix(defaultOptions.prefix)
        .count()
      expect(initCount).toBeGreaterThanOrEqual(1)
      subject.clear(err => {
        expect(err).toBeNull()
        client
          .getAll()
          .prefix(defaultOptions.prefix)
          .count()
          .then(count => {
            expect(count).toBe(0)
            done()
          })
      })
    })

    it('should clear all the sessions data with another prefix', async done => {
      const { subject, client } = await createSubject({ prefix: anotherPrefix })
      const initCount = await client
        .getAll()
        .prefix(anotherPrefix)
        .count()
      expect(initCount).toBeGreaterThanOrEqual(1)
      subject.clear(err => {
        expect(err).toBeNull()
        client
          .getAll()
          .prefix(anotherPrefix)
          .count()
          .then(count => {
            expect(count).toBe(0)
            done()
          })
      })
    })

    it('should not destroy data from others prefixes', async done => {
      const { subject, client } = await createSubject()
      subject.clear(err => {
        expect(err).toBeNull()
        client
          .getAll()
          .prefix(anotherPrefix)
          .count()
          .then(count => {
            expect(count).toBeGreaterThanOrEqual(1)
            done()
          })
      })
    })

    it('should return an error at the callback if the client blow up', async done => {
      const { subject, client } = await createSubject()
      jest.spyOn(client, 'delete').mockImplementationOnce(() => {
        throw new Error()
      })
      subject.clear(err => {
        expect(err).toBeInstanceOf(Error)
        done()
      })
    })

    it('should return an error at the callback if the client return an rejected promise', async done => {
      const { subject } = await createSubject()
      jest
        .spyOn(DeleteBuilder.prototype, 'prefix')
        .mockReturnValueOnce(Promise.reject('any rejection'))
      subject.clear(err => {
        expect(err).toBeTruthy()
        done()
      })
    })
  })

  describe('when getting the ttl', () => {
    const ttl = 666

    it('should get ttl from the ttl attribute from the store as a number', async () => {
      const { subject } = await createSubject()
      subject['ttl'] = ttl
      expect(subject['getTTL'](null, null)).toBe(ttl)
    })

    it('should get ttl from the ttl attribute from the store as a string', async () => {
      const { subject } = await createSubject()
      subject['ttl'] = String(ttl)
      expect(subject['getTTL'](null, null)).toBe(ttl)
    })

    it('should get ttl from the ttl attribute from the store as a function', async () => {
      const { subject } = await createSubject()
      const ttlFunc = (subject['ttl'] = jest.fn())
      ttlFunc.mockReturnValue(ttl)
      expect(subject['getTTL'](sessionData, sessionData.sid)).toBe(ttl)
      expect(ttlFunc).toHaveBeenLastCalledWith(subject, sessionData, sessionData.sid)
    })

    it('should throw an TypeError if the ttl attribute from the store has an unknown type', async () => {
      const { subject } = await createSubject()
      subject['ttl'] = {}
      expect(() => subject['getTTL'](null, null)).toThrowError(TypeError)
    })

    it('should get ttl from the maxAge cookie when it is an number', async () => {
      const { subject } = await createSubject()
      const session = { ...sessionData, cookie: { ...sessionData.cookie, maxAge: 1000 } }
      expect(subject['getTTL'](session, null)).toBe(1)
    })

    it('should use default value from one day if any other value could be used', async () => {
      const { subject } = await createSubject()
      const session = { ...sessionData, cookie: { ...sessionData.cookie, maxAge: 'what?' as any } }
      expect(subject['getTTL'](session, null)).toBe(oneDay)
    })
  })
})
