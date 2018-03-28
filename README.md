# express-session-etcd3

[![CircleCI](https://circleci.com/gh/jexia/express-session-etcd3.svg?style=svg)](https://circleci.com/gh/jexia/express-session-etcd3)

An ETCD v3 store adapter for [express-session](https://github.com/expressjs/session) using [etcd3](https://github.com/mixer/etcd3) client.

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

You can find all the [available options](https://jexia.github.io/express-session-etcd3/interfaces/etcd3storeoptions.html) at the documentation.

## Documentation

Our [TypeDoc docs are available here](https://jexia.github.io/express-session-etcd3/).

Our [test cases](https://github.com/jexia/express-session-etcd3/tree/master/test) are also quite readable.

## Contributing

You can find all the steps at the [Contributing Guide](https://github.com/jexia/express-session-etcd3/blob/master/CONTRIBUTING.md).

## Credits

This project was easily bootstrapped with [TypeScript library starter](https://github.com/alexjoverm/typescript-library-starter), thanks for sharing it!

## License

[MIT](https://github.com/jexia/express-session-etcd3/blob/master/LICENSE)
