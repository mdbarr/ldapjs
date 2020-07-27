// Copyright 2011 Mark Cavage, Inc.  All rights reserved.
'use strict';

const { v4: uuid } = require('uuid');
const vasync = require('vasync');

////////////////////
// Globals

const SUFFIX = 'dc=test';

const SERVER_PORT = process.env.SERVER_PORT || 45636;

let ldap;
let client;
let server;
let sock;

function getSock () {
  if (process.platform === 'win32') {
    return `\\\\.\\pipe\\${ uuid() }`;
  }
  return `/tmp/.${ uuid() }`;
}

////////////////////
// Tests

test('load library', () => {
  ldap = require('../lib/index');
  expect(ldap.createServer).toBeTruthy();
});

test('basic create', () => {
  server = ldap.createServer();
  expect(server).toBeTruthy();
});

test('properties', done => {
  expect(server.name).toBe('LDAPServer');

  server.maxConnections = 10;
  expect(server.maxConnections).toBe(10);

  expect(server.url).toBe(null);
  // listen on a random port so we have a url
  server.listen(0, 'localhost', () => {
    expect(server.url).toBeTruthy();

    server.close();
    done();
  });
});

test('listen on unix/named socket', done => {
  expect.assertions(2);
  server = ldap.createServer();
  sock = getSock();
  server.listen(sock, () => {
    expect(server.url).toBeTruthy();
    expect(server.url.split(':')[0]).toBe('ldapi');
    server.close();
    done();
  });
});

test('listen on static port', done => {
  expect.assertions(2);
  server = ldap.createServer();
  server.listen(SERVER_PORT, '127.0.0.1', () => {
    const addr = server.address();
    expect(addr.port).toBe(parseInt(SERVER_PORT, 10));
    expect(server.url).toBe(`ldap://127.0.0.1:${ SERVER_PORT }`);
    server.close();
    done();
  });
});

test('listen on ephemeral port', done => {
  expect.assertions(2);
  server = ldap.createServer();
  server.listen(0, 'localhost', () => {
    const addr = server.address();
    expect(addr.port > 0).toBeTruthy();
    expect(addr.port < 65535).toBeTruthy();
    server.close();
    done();
  });
});

test('route order', done => {
  function generateHandler (response) {
    const func = function handler (req, res, next) {
      res.send({
        dn: response,
        attributes: { },
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
    expect(true).toBeTruthy();
    client = ldap.createClient({ socketPath: sock });
    function runSearch (value, cb) {
      client.search(value, '(objectclass=*)', (err, res) => {
        expect(err).toBeFalsy();
        expect(res).toBeTruthy();
        res.on('searchEntry', (entry) => {
          expect(entry.dn.toString()).toBe(value);
        });
        res.on('end', () => {
          cb();
        });
      });
    }

    vasync.forEachParallel({
      'func': runSearch,
      'inputs': [ dnShort, dnMed, dnLong ],
    }, (err) => {
      expect(err).toBeFalsy();
      client.unbind();
      server.close();
      done();
    });
  });
});

test('route absent', done => {
  server = ldap.createServer();
  sock = getSock();
  const DN_ROUTE = 'dc=base';
  const DN_MISSING = 'dc=absent';

  server.bind(DN_ROUTE, (req, res, next) => {
    res.end();
    return next();
  });

  server.listen(sock, () => {
    expect(true).toBeTruthy();
    vasync.parallel({
      'funcs': [
        function presentBind (cb) {
          const clt = ldap.createClient({ socketPath: sock });
          clt.bind(DN_ROUTE, '', (err) => {
            expect(err).toBeFalsy();
            clt.unbind();
            cb();
          });
        },
        function absentBind (cb) {
          const clt = ldap.createClient({ socketPath: sock });
          clt.bind(DN_MISSING, '', (err) => {
            expect(err).toBeTruthy();
            expect(err.code).toBe(ldap.LDAP_NO_SUCH_OBJECT);
            clt.unbind();
            cb();
          });
        },
      ],
    }, (err) => {
      expect(err).toBeFalsy();
      server.close();
      done();
    });
  });
});

test('route unbind', done => {
  expect.assertions(4);
  server = ldap.createServer();
  sock = getSock();

  server.unbind((req, res, next) => {
    expect(true).toBeTruthy();
    res.end();
    return next();
  });

  server.listen(sock, () => {
    expect(true).toBeTruthy();
    client = ldap.createClient({ socketPath: sock });
    client.bind('', '', (err) => {
      expect(err).toBeFalsy();
      client.unbind((err) => {
        expect(err).toBeFalsy();
        server.close();
        done();
      });
    });
  });
});

test('strict routing', done => {
  const testDN = 'cn=valid';
  let clt;
  vasync.pipeline({
    funcs: [
      function setup (_, cb) {
      // strictDN: true - on by default
        server = ldap.createServer({});
        sock = getSock();
        // invalid DNs would go to default handler
        server.search('', (req, res, next) => {
          expect(req.dn).toBeTruthy();
          expect(typeof req.dn).toBe('object');
          expect(req.dn.toString()).toBe(testDN);
          res.end();
          next();
        });
        server.listen(sock, () => {
          expect(true).toBeTruthy();
          clt = ldap.createClient({
            socketPath: sock,
            strictDN: false,
          });
          cb();
        });
      },
      function testBad (_, cb) {
        clt.search('not a dn', { scope: 'base' }, (err, res) => {
          expect(err).toBeFalsy();
          res.once('error', (err2) => {
            expect(err2).toBeTruthy();
            expect(err2.code).toBe(ldap.LDAP_INVALID_DN_SYNTAX);
            cb();
          });
          res.once('end', () => {
            done.fail('accepted invalid dn');
            cb('bogus');
          });
        });
      },
      function testGood (_, cb) {
        clt.search(testDN, { scope: 'base' }, (err, res) => {
          expect(err).toBeFalsy();
          res.once('error', (err2) => {
            expect(err2).toBeFalsy();
            cb(err2);
          });
          res.once('end', (result) => {
            expect(result).toBeTruthy();
            cb();
          });
        });
      },
    ],
  }, (err) => {
    expect(err).toBeFalsy();

    if (clt) {
      clt.destroy();
    }
    server.close();
    done();
  });
});

test('non-strict routing', done => {
  server = ldap.createServer({ strictDN: false });
  sock = getSock();
  const testDN = 'this ain\'t a DN';

  // invalid DNs go to default handler
  server.search('', (req, res, next) => {
    expect(req.dn).toBeTruthy();
    expect(typeof req.dn).toBe('string');
    expect(req.dn).toBe(testDN);
    res.end();
    next();
  });

  server.listen(sock, () => {
    expect(true).toBeTruthy();
    const clt = ldap.createClient({
      socketPath: sock,
      strictDN: false,
    });
    clt.search(testDN, { scope: 'base' }, (err, res) => {
      expect(err).toBeFalsy();
      res.on('end', () => {
        clt.destroy();
        server.close();
        done();
      });
    });
  });
});
