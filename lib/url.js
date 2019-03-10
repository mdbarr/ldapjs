// Copyright 2011 Mark Cavage, Inc.  All rights reserved.
'use strict';

const querystring = require('querystring');
const url = require('url');
const util = require('util');

const dn = require('./dn');
const filter = require('./filters/index');

module.exports = { parse (urlStr, parseDN) {
  const u = url.parse(urlStr);
  if (!u.protocol || !(u.protocol === 'ldap:' || u.protocol === 'ldaps:')) { throw new TypeError(`${ urlStr } is an invalid LDAP url (protocol)`); }

  u.secure = u.protocol === 'ldaps:';

  if (!u.hostname) { u.hostname = 'localhost'; }

  if (!u.port) {
    u.port = u.secure ? 636 : 389;
  } else {
    u.port = parseInt(u.port, 10);
  }

  if (u.pathname) {
    u.pathname = querystring.unescape(u.pathname.substr(1));
    u.DN = parseDN ? dn.parse(u.pathname) : u.pathname;
  }

  if (u.search) {
    u.attributes = [];
    const tmp = u.search.substr(1).split('?');
    if (tmp && tmp.length) {
      if (tmp[0]) {
        tmp[0].split(',').forEach((a) => {
          u.attributes.push(querystring.unescape(a.trim()));
        });
      }
    }
    if (tmp[1]) {
      if (tmp[1] !== 'base' && tmp[1] !== 'one' && tmp[1] !== 'sub') { throw new TypeError(`${ urlStr } is an invalid LDAP url (scope)`); }
      u.scope = tmp[1];
    }
    if (tmp[2]) {
      u.filter = querystring.unescape(tmp[2]);
    }
    if (tmp[3]) {
      u.extensions = querystring.unescape(tmp[3]);
    }

    if (!u.scope) { u.scope = 'base'; }
    if (!u.filter) { u.filter = filter.parseString('(objectclass=*)'); } else { u.filter = filter.parseString(u.filter); }
  }

  return u;
} };
