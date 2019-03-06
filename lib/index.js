// Copyright 2011 Mark Cavage, Inc.  All rights reserved.

const Logger = require('bunyan');

const client = require('./client');
const Attribute = require('./attribute');
const Change = require('./change');
const Protocol = require('./protocol');
const Server = require('./server');

const assert = require('assert');
const controls = require('./controls');
const persistentSearch = require('./persistent_search');
const dn = require('./dn');
const errors = require('./errors');
const filters = require('./filters');
const messages = require('./messages');
const url = require('./url');

///--- API

module.exports = {
  Client: client.Client,
  createClient: client.createClient,

  Server: Server,
  createServer: function (options) {
    if (options === undefined)
      options = {};

    if (typeof (options) !== 'object')
      throw new TypeError('options (object) required');

    if (!options.log) {
      options.log = new Logger({
        name: 'ldapjs',
        component: 'client',
        stream: process.stderr
      });
    }

    return new Server(options);
  },

  Attribute: Attribute,
  Change: Change,

  dn: dn,
  DN: dn.DN,
  RDN: dn.RDN,
  parseDN: dn.parse,

  persistentSearch: persistentSearch,
  PersistentSearchCache: persistentSearch.PersistentSearchCache,

  filters: filters,
  parseFilter: filters.parseString,

  url: url,
  parseURL: url.parse
};

///--- Export all the childrenz

let k;

for (k in Protocol) {
  if (Protocol.hasOwnProperty(k))
    module.exports[k] = Protocol[k];
}

for (k in messages) {
  if (messages.hasOwnProperty(k))
    module.exports[k] = messages[k];
}

for (k in controls) {
  if (controls.hasOwnProperty(k))
    module.exports[k] = controls[k];
}

for (k in filters) {
  if (filters.hasOwnProperty(k)) {
    if (k !== 'parse' && k !== 'parseString')
      module.exports[k] = filters[k];
  }
}

for (k in errors) {
  if (errors.hasOwnProperty(k)) {
    module.exports[k] = errors[k];
  }
}
