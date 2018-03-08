# express-session-etcd3

An ETCD v3 store adapter for [Express session](https://github.com/expressjs/session) using [etcd3](https://github.com/mixer/etcd3) client.

## Setup

Install this package with all necessary peer dependencies:

```sh
npm install express-session-etcd3 express-session etcd3
```

Pass the necessary configuration to access your etcd v3 base into the `Etcd3Store` constructor as `options`:

```js
var session = require('express-session');
var Etcd3Store = require('express-session-etcd3');

app.use(session({
    store: new Etcd3Store(options),
    secret: 'keyboard cat',
    resave: false
}));
```

### Options

You can find all the [available options](https://willgm.github.io/express-session-etcd3/interfaces/etcd3storeoptions.html) at the documentation.

## Documentation

Our [TypeDoc docs are available here](https://willgm.github.io/express-session-etcd3/).

Our [test cases](https://github.com/willgm/express-session-etcd3/tree/master/test) are also quite readable.

## Contributing

Running tests for this module requires running an etcd3 server locally. The tests try to use the default port initially, and you can configure this by setting the ETCD_ADDR environment variable, like export ETCD_ADDR=localhost:12345.

There is a Docker image ready to use, which can be easily build with:

```sh
npm run docker
```

## Credits

This project was easily bootstrapped with [TypeScript library starter](https://github.com/alexjoverm/typescript-library-starter), thanks for sharing it!

## License

[MIT](https://github.com/willgm/express-session-etcd3/blob/master/LICENSE)
