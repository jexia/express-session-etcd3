import * as fs from 'fs'
import * as tls from 'tls'

const rootCertificate = fs.readFileSync(`${__dirname}/certs/certs/ca.crt`)
const tlsCert = fs.readFileSync(`${__dirname}/certs/certs/etcd0.localhost.crt`)
const tlsKey = fs.readFileSync(`${__dirname}/certs/private/etcd0.localhost.key`)
const etcdSourceAddress = process.env.ETCD_ADDR || '127.0.0.1:2379'
const [etcdSourceHost, etcdSourcePort] = etcdSourceAddress.split(':')
