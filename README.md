# express-session-etcd3

This is a etcd v3 session store for Express.

## Setup

```sh
npm install express-session-etcd3 express-session
```

Pass the `express-session` store into `express-session-etcd3` to create a `Etcd3Store` constructor.

```js
var session = require('express-session');
var Etcd3Store = require('express-session-etcd3');

app.use(session({
    store: new Etcd3Store(options),
    secret: 'keyboard cat',
    resave: false
}));
```

## License

MIT
