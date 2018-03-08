# Contributing Guide

We're really glad you're reading this, because we need volunteer developers to help this project come to fruition. 👏

## Instructions

These steps will guide you through contributing to this project:

- Fork the repo
- Clone it and install dependencies
- Setup test env

Running tests for this module requires running an etcd3 server locally. The tests try to use the default port initially, and you can configure this by setting the ETCD_ADDR environment variable, like export ETCD_ADDR=localhost:12345.

There is a Docker image ready to use, which can be easily build with:

```sh
npm run docker
```

Finally send a [GitHub Pull Request](https://github.com/alexjoverm/typescript-library-starter/compare?expand=1) with a clear list of what you've done (read more [about pull requests](https://help.github.com/articles/about-pull-requests/)). Make sure all of your commits are atomic (one feature per commit).
