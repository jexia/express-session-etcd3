import Etcd3Store from '../src/express-session-etcd3'

/**
 * Dummy test
 */
describe('Dummy test', () => {
  it('works if true is truthy', () => {
    expect(true).toBeTruthy()
  })

  it('Etcd3Store is instantiable', () => {
    expect(new Etcd3Store()).toBeInstanceOf(Etcd3Store)
  })
})
