// Copyright 2011 Mark Cavage, Inc.  All rights reserved.
'use strict';

const test = require('tape').test;
const uuid = require('uuid/v4');
const vasync = require('vasync');

////////////////////
// Globals

const SUFFIX = 'dc=test';

const SERVER_PORT = process.env.SERVER_PORT || 1389;

let ldap;
let client;
let server;
let sock;

function getSock() {
  if (process.platform === 'win32') {
    return `\\\\.\\pipe\\${ uuid() }`;
  }
  return `/tmp/.${ uuid() }`;
}

////////////////////
// Tests

test('load library', (t) => {
  ldap = require('../lib/index');
  t.ok(ldap.createServer);
  t.end();
});

test('basic create', (t) => {
  server = ldap.createServer();
  t.ok(server);
  t.end();
});

test('properties', (t) => {
  t.equal(server.name, 'LDAPServer');

  server.maxConnections = 10;
  t.equal(server.maxConnections, 10);

  t.equal(server.url, null, 'url empty before bind');
  // listen on a random port so we have a url
  server.listen(0, 'localhost', () => {
    t.ok(server.url);

    server.close();
    t.end();
  });
});

test('listen on unix/named socket', (t) => {
  t.plan(2);
  server = ldap.createServer();
  sock = getSock();
  server.listen(sock, () => {
    t.ok(server.url);
    t.equal(server.url.split(':')[0], 'ldapi');
    server.close();
    t.end();
  });
});

test('listen on static port', (t) => {
  t.plan(2);
  server = ldap.createServer();
  server.listen(SERVER_PORT, '127.0.0.1', () => {
    const addr = server.address();
    t.equal(addr.port, parseInt(SERVER_PORT, 10));
    t.equals(server.url, `ldap://127.0.0.1:${ SERVER_PORT }`);
    server.close();
    t.end();
  });
});

test('listen on ephemeral port', (t) => {
  t.plan(2);
  server = ldap.createServer();
  server.listen(0, 'localhost', () => {
    const addr = server.address();
    t.ok(addr.port > 0);
    t.ok(addr.port < 65535);
    server.close();
    t.end();
  });
});

test('route order', (t) => {
  function generateHandler(response) {
    const func = function handler(req, res, next) {
      res.send({
        dn: response,
        attributes: { }
      });
      res.end();
      return next();
    };
    return func;
  }

  server = ldap.createServer();
  sock = getSock();
  const dnShort = SUFFIX;
  const dnMed = `dc=sub, ${ SUFFIX }`;
  const dnLong = `dc=long, dc=sub, ${ SUFFIX }`;

  // Mount routes out of order
  server.search(dnMed, generateHandler(dnMed));
  server.search(dnShort, generateHandler(dnShort));
  server.search(dnLong, generateHandler(dnLong));
  server.listen(sock, () => {
    t.ok(true, 'server listen');
    client = ldap.createClient({ socketPath: sock });
    function runSearch(value, cb) {
      client.search(value, '(objectclass=*)', (err, res) => {
        t.ifError(err);
        t.ok(res);
        res.on('searchEntry', (entry) => {
          t.equal(entry.dn.toString(), value);
        });
        res.on('end', () => {
          cb();
        });
      });
    }

    vasync.forEachParallel({
      'func': runSearch,
      'inputs': [ dnShort, dnMed, dnLong ]
    }, (err) => {
      t.notOk(err);
      client.unbind();
      server.close();
      t.end();
    });
  });
});

test('route absent', (t) => {
  server = ldap.createServer();
  sock = getSock();
  const DN_ROUTE = 'dc=base';
  const DN_MISSING = 'dc=absent';

  server.bind(DN_ROUTE, (req, res, next) => {
    res.end();
    return next();
  });

  server.listen(sock, () => {
    t.ok(true, 'server startup');
    vasync.parallel({ 'funcs': [
      function presentBind(cb) {
        const clt = ldap.createClient({ socketPath: sock });
        clt.bind(DN_ROUTE, '', (err) => {
          t.notOk(err);
          clt.unbind();
          cb();
        });
      },
      function absentBind(cb) {
        const clt = ldap.createClient({ socketPath: sock });
        clt.bind(DN_MISSING, '', (err) => {
          t.ok(err);
          t.equal(err.code, ldap.LDAP_NO_SUCH_OBJECT);
          clt.unbind();
          cb();
        });
      }
    ] }, (err) => {
      t.notOk(err);
      server.close();
      t.end();
    });
  });
});

test('route unbind', (t) => {
  t.plan(4);
  server = ldap.createServer();
  sock = getSock();

  server.unbind((req, res, next) => {
    t.ok(true, 'server unbind successful');
    res.end();
    return next();
  });

  server.listen(sock, () => {
    t.ok(true, 'server startup');
    client = ldap.createClient({ socketPath: sock });
    client.bind('', '', (err) => {
      t.ifError(err, 'client bind error');
      client.unbind((err) => {
        t.ifError(err, 'client unbind error');
        server.close();
        t.end();
      });
    });
  });
});

test('strict routing', (t) => {
  const testDN = 'cn=valid';
  let clt;
  vasync.pipeline({ funcs: [
    function setup(_, cb) {
      // strictDN: true - on by default
      server = ldap.createServer({});
      sock = getSock();
      // invalid DNs would go to default handler
      server.search('', (req, res, next) => {
        t.ok(req.dn);
        t.equal(typeof req.dn, 'object');
        t.equal(req.dn.toString(), testDN);
        res.end();
        next();
      });
      server.listen(sock, () => {
        t.ok(true, 'server startup');
        clt = ldap.createClient({
          socketPath: sock,
          strictDN: false
        });
        cb();
      });
    },
    function testBad(_, cb) {
      clt.search('not a dn', { scope: 'base' }, (err, res) => {
        t.ifError(err);
        res.once('error', (err2) => {
          t.ok(err2);
          t.equal(err2.code, ldap.LDAP_INVALID_DN_SYNTAX);
          cb();
        });
        res.once('end', () => {
          t.fail('accepted invalid dn');
          cb('bogus');
        });
      });
    },
    function testGood(_, cb) {
      clt.search(testDN, { scope: 'base' }, (err, res) => {
        t.ifError(err);
        res.once('error', (err2) => {
          t.ifError(err2);
          cb(err2);
        });
        res.once('end', (result) => {
          t.ok(result, 'accepted invalid dn');
          cb();
        });
      });
    }
  ] }, (err) => {
    t.ifError(err);

    if (clt) {
      clt.destroy();
    }
    server.close();
    t.end();
  });
});

test('non-strict routing', (t) => {
  server = ldap.createServer({ strictDN: false });
  sock = getSock();
  const testDN = 'this ain\'t a DN';

  // invalid DNs go to default handler
  server.search('', (req, res, next) => {
    t.ok(req.dn);
    t.equal(typeof req.dn, 'string');
    t.equal(req.dn, testDN);
    res.end();
    next();
  });

  server.listen(sock, () => {
    t.ok(true, 'server startup');
    const clt = ldap.createClient({
      socketPath: sock,
      strictDN: false
    });
    clt.search(testDN, { scope: 'base' }, (err, res) => {
      t.ifError(err);
      res.on('end', () => {
        clt.destroy();
        server.close();
        t.end();
      });
    });
  });
});
