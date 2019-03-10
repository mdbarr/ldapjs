// Copyright 2011 Mark Cavage, Inc.  All rights reserved.
'use strict';

const Logger = require('bunyan');

const test = require('tape').test;
const uuid = require('uuid/v4');
const vasync = require('vasync');
const util = require('util');

////////////////////
// Globals

const BIND_DN = 'cn=root';
const BIND_PW = 'secret';
const SOCKET = `/tmp/.${ uuid() }`;

const SUFFIX = 'dc=test';

const LOG = new Logger({
  name: 'ldapjs_unit_test',
  stream: process.stderr,
  level: process.env.LOG_LEVEL || 'info',
  serializers: Logger.stdSerializers,
  src: true
});

let ldap;
let Attribute;
let Change;
let client;
let server;

////////////////////
// Tests

test('setup', (t) => {
  ldap = require('../lib/index');
  t.ok(ldap);
  t.ok(ldap.createClient);
  t.ok(ldap.createServer);
  t.ok(ldap.Attribute);
  t.ok(ldap.Change);

  Attribute = ldap.Attribute;
  Change = ldap.Change;

  server = ldap.createServer();
  t.ok(server);

  server.bind(BIND_DN, (req, res, next) => {
    if (req.credentials !== BIND_PW) { return next(new ldap.InvalidCredentialsError('Invalid password')); }

    res.end();
    return next();
  });

  server.add(SUFFIX, (req, res, next) => {
    res.end();
    return next();
  });

  server.compare(SUFFIX, (req, res, next) => {
    res.end(req.value === 'test');
    return next();
  });

  server.del(SUFFIX, (req, res, next) => {
    res.end();
    return next();
  });

  // LDAP whoami
  server.exop('1.3.6.1.4.1.4203.1.11.3', (req, res, next) => {
    res.value = 'u:xxyyz@EXAMPLE.NET';
    res.end();
    return next();
  });

  server.modify(SUFFIX, (req, res, next) => {
    res.end();
    return next();
  });

  server.modifyDN(SUFFIX, (req, res, next) => {
    res.end();
    return next();
  });

  server.search('dc=slow', (req, res, next) => {
    res.send({
      dn: 'dc=slow',
      attributes: {
        'you': 'wish',
        'this': 'was',
        'faster': '.'
      }
    });
    setTimeout(() => {
      res.end();
      next();
    }, 250);
  });

  server.search('dc=timeout', () => {
    // intentional timeout
  });

  server.search(SUFFIX, (req, res, next) => {
    if (req.dn.equals(`cn=ref,${ SUFFIX }`)) {
      res.send(res.createSearchReference('ldap://localhost'));
    } else if (req.dn.equals(`cn=bin,${ SUFFIX }`)) {
      res.send(res.createSearchEntry({
        objectName: req.dn,
        attributes: {
          'foo;binary': 'wr0gKyDCvCA9IMK+',
          'gb18030': new Buffer([ 0xB5, 0xE7, 0xCA, 0xD3, 0xBB, 0xFA ]),
          'objectclass': 'binary'
        }
      }));
    } else {
      const e = res.createSearchEntry({
        objectName: req.dn,
        attributes: {
          cn: [ 'unit', 'test' ],
          SN: 'testy'
        }
      });
      res.send(e);
      res.send(e);
    }

    res.end();
    return next();
  });

  server.search('cn=sizelimit', (req, res, next) => {
    const sizeLimit = 200;
    let i;
    for (i = 0; i < 1000; i++) {
      if (req.sizeLimit > 0 && i >= req.sizeLimit) {
        break;
      } else if (i > sizeLimit) {
        res.end(ldap.LDAP_SIZE_LIMIT_EXCEEDED);
        return next();
      }
      res.send({
        dn: util.format('o=%d, cn=sizelimit', i),
        attributes: {
          o: [ i ],
          objectclass: [ 'pagedResult' ]
        }
      });
    }
    res.end();
    return next();
  });

  server.search('cn=paged', (req, res, next) => {
    const min = 0;
    const max = 1000;

    function sendResults(start, end) {
      start = start < min ? min : start;
      end = end > max || end < min ? max : end;
      let i;
      for (i = start; i < end; i++) {
        res.send({
          dn: util.format('o=%d, cn=paged', i),
          attributes: {
            o: [ i ],
            objectclass: [ 'pagedResult' ]
          }
        });
      }
      return i;
    }

    let cookie = null;
    let pageSize = 0;
    req.controls.forEach((control) => {
      if (control.type === ldap.PagedResultsControl.OID) {
        pageSize = control.value.size;
        cookie = control.value.cookie;
      }
    });

    if (cookie && Buffer.isBuffer(cookie)) {
      // Do simple paging
      let first = min;
      if (cookie.length !== 0) {
        first = parseInt(cookie.toString(), 10);
      }
      const last = sendResults(first, first + pageSize);

      let resultCookie;
      if (last < max) {
        resultCookie = new Buffer(last.toString());
      } else {
        resultCookie = new Buffer('');
      }
      res.controls.push(new ldap.PagedResultsControl({ value: {
        size: pageSize, // correctness not required here
        cookie: resultCookie
      } }));
      res.end();
      return next();
    }
    // don't allow non-paged searches for this test endpoint
    return next(new ldap.UnwillingToPerformError());
  });

  server.search('cn=pagederr', (req, res, next) => {
    let cookie = null;
    req.controls.forEach((control) => {
      if (control.type === ldap.PagedResultsControl.OID) {
        cookie = control.value.cookie;
      }
    });
    if (cookie && Buffer.isBuffer(cookie) && cookie.length === 0) {
      // send first "page"
      res.send({
        dn: util.format('o=result, cn=pagederr'),
        attributes: {
          o: 'result',
          objectclass: [ 'pagedResult' ]
        }
      });
      res.controls.push(new ldap.PagedResultsControl({ value: {
        size: 2,
        cookie: new Buffer('a')
      } }));
      res.end();
      return next();
    }
    // send error instead of second page
    res.end(ldap.LDAP_SIZE_LIMIT_EXCEEDED);
    return next();
  });

  server.search('dc=empty', (req, res, next) => {
    res.send({
      dn: 'dc=empty',
      attributes: {
        member: [],
        'member;range=0-1': [ 'cn=user1, dc=empty', 'cn=user2, dc=empty' ]
      }
    });
    res.end();
    return next();
  });

  server.search('cn=busy', (req, res, next) => {
    next(new ldap.BusyError('too much to do'));
  });

  server.search('', (req, res, next) => {
    if (req.dn.toString() === '') {
      res.send({
        dn: '',
        attributes: { objectclass: [ 'RootDSE', 'top' ] }
      });
      res.end();
    } else {
      // Turn away any other requests (since '' is the fallthrough route)
      res.errorMessage = `No tree found for: ${ req.dn.toString() }`;
      res.end(ldap.LDAP_NO_SUCH_OBJECT);
    }
    return next();
  });

  server.unbind((req, res, next) => {
    res.end();
    return next();
  });

  server.listen(SOCKET, () => {
    client = ldap.createClient({
      connectTimeout: parseInt(process.env.LDAP_CONNECT_TIMEOUT || 0, 10),
      socketPath: SOCKET,
      log: LOG
    });
    t.ok(client);
    t.end();
  });
});

test('simple bind failure', (t) => {
  client.bind(BIND_DN, uuid(), (err, res) => {
    t.ok(err);
    t.notOk(res);

    t.ok(err instanceof ldap.InvalidCredentialsError);
    t.ok(err instanceof Error);
    t.ok(err.dn);
    t.ok(err.message);
    t.ok(err.stack);

    t.end();
  });
});

test('simple bind success', (t) => {
  client.bind(BIND_DN, BIND_PW, (err, res) => {
    t.ifError(err);
    t.ok(res);
    t.equal(res.status, 0);
    t.end();
  });
});

test('simple anonymous bind (empty credentials)', (t) => {
  client.bind('', '', (err, res) => {
    t.ifError(err);
    t.ok(res);
    t.equal(res.status, 0);
    t.end();
  });
});

test('auto-bind bad credentials', (t) => {
  const clt = ldap.createClient({
    socketPath: SOCKET,
    bindDN: BIND_DN,
    bindCredentials: 'totallybogus',
    log: LOG
  });
  clt.once('error', (err) => {
    t.equal(err.code, ldap.LDAP_INVALID_CREDENTIALS);
    clt.destroy();
    t.end();
  });
});

test('auto-bind success', (t) => {
  const clt = ldap.createClient({
    socketPath: SOCKET,
    bindDN: BIND_DN,
    bindCredentials: BIND_PW,
    log: LOG
  });
  clt.once('connect', () => {
    t.ok(clt);
    clt.destroy();
    t.end();
  });
});

test('add success', (t) => {
  const attrs = [
    new Attribute({
      type: 'cn',
      vals: [ 'test' ]
    })
  ];
  client.add(`cn=add, ${ SUFFIX }`, attrs, (err, res) => {
    t.ifError(err);
    t.ok(res);
    t.equal(res.status, 0);
    t.end();
  });
});

test('add success with object', (t) => {
  const entry = {
    cn: [ 'unit', 'add' ],
    sn: 'test'
  };
  client.add(`cn=add, ${ SUFFIX }`, entry, (err, res) => {
    t.ifError(err);
    t.ok(res);
    t.equal(res.status, 0);
    t.end();
  });
});

test('compare success', (t) => {
  client.compare(`cn=compare, ${ SUFFIX }`, 'cn', 'test', (err,
    matched,
    res) => {
    t.ifError(err);
    t.ok(matched);
    t.ok(res);
    t.end();
  });
});

test('compare false', (t) => {
  client.compare(`cn=compare, ${ SUFFIX }`, 'cn', 'foo', (err,
    matched,
    res) => {
    t.ifError(err);
    t.notOk(matched);
    t.ok(res);
    t.end();
  });
});

test('compare bad suffix', (t) => {
  client.compare(`cn=${ uuid() }`, 'cn', 'foo', (err,
    matched,
    res) => {
    t.ok(err);
    t.ok(err instanceof ldap.NoSuchObjectError);
    t.notOk(matched);
    t.notOk(res);
    t.end();
  });
});

test('delete success', (t) => {
  client.del(`cn=delete, ${ SUFFIX }`, (err, res) => {
    t.ifError(err);
    t.ok(res);
    t.end();
  });
});

test('delete with control (GH-212)', (t) => {
  const control = new ldap.Control({
    type: '1.2.3.4',
    criticality: false
  });
  client.del(`cn=delete, ${ SUFFIX }`, control, (err, res) => {
    t.ifError(err);
    t.ok(res);
    t.end();
  });
});

test('exop success', (t) => {
  client.exop('1.3.6.1.4.1.4203.1.11.3', (err, value, res) => {
    t.ifError(err);
    t.ok(value);
    t.ok(res);
    t.equal(value, 'u:xxyyz@EXAMPLE.NET');
    t.end();
  });
});

test('exop invalid', (t) => {
  client.exop('1.2.3.4', (err, res) => {
    t.ok(err);
    t.ok(err instanceof ldap.ProtocolError);
    t.notOk(res);
    t.end();
  });
});

test('bogus exop (GH-17)', (t) => {
  client.exop('cn=root', (err) => {
    t.ok(err);
    t.end();
  });
});

test('modify success', (t) => {
  const change = new Change({
    type: 'Replace',
    modification: new Attribute({
      type: 'cn',
      vals: [ 'test' ]
    })
  });
  client.modify(`cn=modify, ${ SUFFIX }`, change, (err, res) => {
    t.ifError(err);
    t.ok(res);
    t.equal(res.status, 0);
    t.end();
  });
});

test('modify change plain object success', (t) => {
  const change = new Change({
    type: 'Replace',
    modification: { cn: 'test' }
  });
  client.modify(`cn=modify, ${ SUFFIX }`, change, (err, res) => {
    t.ifError(err);
    t.ok(res);
    t.equal(res.status, 0);
    t.end();
  });
});

test('modify array success', (t) => {
  const changes = [
    new Change({
      operation: 'Replace',
      modification: new Attribute({
        type: 'cn',
        vals: [ 'test' ]
      })
    }),
    new Change({
      operation: 'Delete',
      modification: new Attribute({ type: 'sn' })
    })
  ];
  client.modify(`cn=modify, ${ SUFFIX }`, changes, (err, res) => {
    t.ifError(err);
    t.ok(res);
    t.equal(res.status, 0);
    t.end();
  });
});

test('modify change plain object success (GH-31)', (t) => {
  const change = {
    type: 'replace',
    modification: {
      cn: 'test',
      sn: 'bar'
    }
  };
  client.modify(`cn=modify, ${ SUFFIX }`, change, (err, res) => {
    t.ifError(err);
    t.ok(res);
    t.equal(res.status, 0);
    t.end();
  });
});

test('modify DN new RDN only', (t) => {
  client.modifyDN(`cn=old, ${ SUFFIX }`, 'cn=new', (err, res) => {
    t.ifError(err);
    t.ok(res);
    t.equal(res.status, 0);
    t.end();
  });
});

test('modify DN new superior', (t) => {
  client.modifyDN(`cn=old, ${ SUFFIX }`, 'cn=new, dc=foo', (err, res) => {
    t.ifError(err);
    t.ok(res);
    t.equal(res.status, 0);
    t.end();
  });
});

test('search basic', (t) => {
  client.search(`cn=test, ${ SUFFIX }`, '(objectclass=*)', (err, res) => {
    t.ifError(err);
    t.ok(res);
    let gotEntry = 0;
    res.on('searchEntry', (entry) => {
      t.ok(entry);
      t.ok(entry instanceof ldap.SearchEntry);
      t.equal(entry.dn.toString(), `cn=test, ${ SUFFIX }`);
      t.ok(entry.attributes);
      t.ok(entry.attributes.length);
      t.equal(entry.attributes[0].type, 'cn');
      t.equal(entry.attributes[1].type, 'SN');
      t.ok(entry.object);
      gotEntry++;
    });
    res.on('error', (err) => {
      t.fail(err);
    });
    res.on('end', (res) => {
      t.ok(res);
      t.ok(res instanceof ldap.SearchResponse);
      t.equal(res.status, 0);
      t.equal(gotEntry, 2);
      t.end();
    });
  });
});

test('search sizeLimit', (t) => {
  t.test('over limit', (t2) => {
    client.search('cn=sizelimit', {}, (err, res) => {
      t2.ifError(err);
      res.on('error', (error) => {
        t2.equal(error.name, 'SizeLimitExceededError');
        t2.end();
      });
    });
  });

  t.test('under limit', (t2) => {
    const limit = 100;
    client.search('cn=sizelimit', { sizeLimit: limit }, (err, res) => {
      t2.ifError(err);
      let count = 0;
      res.on('searchEntry', () => {
        count++;
      });
      res.on('end', () => {
        t2.pass();
        t2.equal(count, limit);
        t2.end();
      });
      res.on('error', t2.ifError.bind(t));
    });
  });
});

test('search paged', (t) => {
  t.test('paged - no pauses', (t2) => {
    let countEntries = 0;
    let countPages = 0;
    client.search('cn=paged', { paged: { pageSize: 100 } }, (err, res) => {
      t2.ifError(err);
      res.on('searchEntry', () => {
        countEntries++;
      });
      res.on('page', () => {
        countPages++;
      });
      res.on('error', t2.ifError.bind(t2));
      res.on('end', () => {
        t2.equal(countEntries, 1000);
        t2.equal(countPages, 10);
        t2.end();
      });
    });
  });

  t.test('paged - pauses', (t2) => {
    let countPages = 0;
    client.search('cn=paged', { paged: {
      pageSize: 100,
      pagePause: true
    } }, (err, res) => {
      t2.ifError(err);
      res.on('page', (result, cb) => {
        countPages++;
        // cancel after 9 to verify callback usage
        if (countPages === 9) {
          // another page should never be encountered
          res.removeAllListeners('page').
            on('page', t2.fail.bind(null, 'unexpected page'));
          return cb(new Error());
        }
        return cb();
      });
      res.on('error', t2.ifError.bind(t2));
      res.on('end', () => {
        t2.equal(countPages, 9);
        t2.end();
      });
    });
  });

  t.test('paged - no support (err handled)', (t2) => {
    client.search(SUFFIX, { paged: { pageSize: 100 } }, (err, res) => {
      t2.ifError(err);
      res.on('pageError', t2.ok.bind(t2));
      res.on('end', () => {
        t2.pass();
        t2.end();
      });
    });
  });

  t.test('paged - no support (err not handled)', (t2) => {
    client.search(SUFFIX, { paged: { pageSize: 100 } }, (err, res) => {
      t2.ifError(err);
      res.on('end', t2.fail.bind(t2));
      res.on('error', (error) => {
        t2.ok(error);
        t2.end();
      });
    });
  });

  t.test('paged - redundant control', (t2) => {
    try {
      client.search(SUFFIX,
        { paged: { pageSize: 100 } },
        new ldap.PagedResultsControl(),
        (err) => {
          t2.ifError(err);
          t2.fail();
        });
    } catch (e) {
      t2.ok(e);
      t2.end();
    }
  });

  t.test('paged - handle later error', (t2) => {
    let countEntries = 0;
    let countPages = 0;
    client.search('cn=pagederr', { paged: { pageSize: 1 } }, (err, res) => {
      t2.ifError(err);
      res.on('searchEntry', () => {
        t2.ok(++countEntries);
      });
      res.on('page', () => {
        t2.ok(++countPages);
      });
      res.on('error', () => {
        t2.equal(countEntries, 1);
        t2.equal(countPages, 1);
        t2.end();
      });
      res.on('end', () => {
        t2.fail('should not be reached');
      });
    });
  });

  t.end();
});

test('search referral', (t) => {
  client.search(`cn=ref, ${ SUFFIX }`, '(objectclass=*)', (err, res) => {
    t.ifError(err);
    t.ok(res);
    let gotEntry = 0;
    let gotReferral = false;
    res.on('searchEntry', () => {
      gotEntry++;
    });
    res.on('searchReference', (referral) => {
      gotReferral = true;
      t.ok(referral);
      t.ok(referral instanceof ldap.SearchReference);
      t.ok(referral.uris);
      t.ok(referral.uris.length);
    });
    res.on('error', (err) => {
      t.fail(err);
    });
    res.on('end', (res) => {
      t.ok(res);
      t.ok(res instanceof ldap.SearchResponse);
      t.equal(res.status, 0);
      t.equal(gotEntry, 0);
      t.ok(gotReferral);
      t.end();
    });
  });
});

test('search rootDSE', (t) => {
  client.search('', '(objectclass=*)', (err, res) => {
    t.ifError(err);
    t.ok(res);
    res.on('searchEntry', (entry) => {
      t.ok(entry);
      t.equal(entry.dn.toString(), '');
      t.ok(entry.attributes);
      t.ok(entry.object);
    });
    res.on('error', (err) => {
      t.fail(err);
    });
    res.on('end', (res) => {
      t.ok(res);
      t.ok(res instanceof ldap.SearchResponse);
      t.equal(res.status, 0);
      t.end();
    });
  });
});

test('search empty attribute', (t) => {
  client.search('dc=empty', '(objectclass=*)', (err, res) => {
    t.ifError(err);
    t.ok(res);
    let gotEntry = 0;
    res.on('searchEntry', (entry) => {
      const obj = entry.toObject();
      t.equal('dc=empty', obj.dn);
      t.ok(obj.member);
      t.equal(obj.member.length, 0);
      t.ok(obj['member;range=0-1']);
      t.ok(obj['member;range=0-1'].length);
      gotEntry++;
    });
    res.on('error', (err) => {
      t.fail(err);
    });
    res.on('end', (res) => {
      t.ok(res);
      t.ok(res instanceof ldap.SearchResponse);
      t.equal(res.status, 0);
      t.equal(gotEntry, 1);
      t.end();
    });
  });
});

test('GH-21 binary attributes', (t) => {
  client.search(`cn=bin, ${ SUFFIX }`, '(objectclass=*)', (err, res) => {
    t.ifError(err);
    t.ok(res);
    let gotEntry = 0;
    const expect = new Buffer('\u00bd + \u00bc = \u00be', 'utf8');
    const expect2 = new Buffer([ 0xB5, 0xE7, 0xCA, 0xD3, 0xBB, 0xFA ]);
    res.on('searchEntry', (entry) => {
      t.ok(entry);
      t.ok(entry instanceof ldap.SearchEntry);
      t.equal(entry.dn.toString(), `cn=bin, ${ SUFFIX }`);
      t.ok(entry.attributes);
      t.ok(entry.attributes.length);
      t.equal(entry.attributes[0].type, 'foo;binary');
      t.equal(entry.attributes[0].vals[0], expect.toString('base64'));
      t.equal(entry.attributes[0].buffers[0].toString('base64'),
        expect.toString('base64'));

      t.ok(entry.attributes[1].type, 'gb18030');
      t.equal(entry.attributes[1].buffers.length, 1);
      t.equal(expect2.length, entry.attributes[1].buffers[0].length);
      for (let i = 0; i < expect2.length; i++) { t.equal(expect2[i], entry.attributes[1].buffers[0][i]); }

      t.ok(entry.object);
      gotEntry++;
    });
    res.on('error', (err) => {
      t.fail(err);
    });
    res.on('end', (res) => {
      t.ok(res);
      t.ok(res instanceof ldap.SearchResponse);
      t.equal(res.status, 0);
      t.equal(gotEntry, 1);
      t.end();
    });
  });
});

test('GH-23 case insensitive attribute filtering', (t) => {
  const opts = {
    filter: '(objectclass=*)',
    attributes: [ 'Cn' ]
  };
  client.search(`cn=test, ${ SUFFIX }`, opts, (err, res) => {
    t.ifError(err);
    t.ok(res);
    let gotEntry = 0;
    res.on('searchEntry', (entry) => {
      t.ok(entry);
      t.ok(entry instanceof ldap.SearchEntry);
      t.equal(entry.dn.toString(), `cn=test, ${ SUFFIX }`);
      t.ok(entry.attributes);
      t.ok(entry.attributes.length);
      t.equal(entry.attributes[0].type, 'cn');
      t.ok(entry.object);
      gotEntry++;
    });
    res.on('error', (err) => {
      t.fail(err);
    });
    res.on('end', (res) => {
      t.ok(res);
      t.ok(res instanceof ldap.SearchResponse);
      t.equal(res.status, 0);
      t.equal(gotEntry, 2);
      t.end();
    });
  });
});

test('GH-24 attribute selection of *', (t) => {
  const opts = {
    filter: '(objectclass=*)',
    attributes: [ '*' ]
  };
  client.search(`cn=test, ${ SUFFIX }`, opts, (err, res) => {
    t.ifError(err);
    t.ok(res);
    let gotEntry = 0;
    res.on('searchEntry', (entry) => {
      t.ok(entry);
      t.ok(entry instanceof ldap.SearchEntry);
      t.equal(entry.dn.toString(), `cn=test, ${ SUFFIX }`);
      t.ok(entry.attributes);
      t.ok(entry.attributes.length);
      t.equal(entry.attributes[0].type, 'cn');
      t.equal(entry.attributes[1].type, 'SN');
      t.ok(entry.object);
      gotEntry++;
    });
    res.on('error', (err) => {
      t.fail(err);
    });
    res.on('end', (res) => {
      t.ok(res);
      t.ok(res instanceof ldap.SearchResponse);
      t.equal(res.status, 0);
      t.equal(gotEntry, 2);
      t.end();
    });
  });
});

test('idle timeout', (t) => {
  client.idleTimeout = 250;
  function premature() {
    t.ifError(true);
  }
  client.on('idle', premature);
  client.search('dc=slow', 'objectclass=*', (err, res) => {
    t.ifError(err);
    res.on('searchEntry', (res) => {
      t.ok(res);
    });
    res.on('error', (err) => {
      t.ifError(err);
    });
    res.on('end', () => {
      const late = setTimeout(() => {
        t.ifError(false, 'too late');
      }, 500);
      // It's ok to go idle now
      client.removeListener('idle', premature);
      client.on('idle', () => {
        clearTimeout(late);
        client.removeAllListeners('idle');
        client.idleTimeout = 0;
        t.end();
      });
    });
  });
});

test('setup action', (t) => {
  const setupClient = ldap.createClient({
    connectTimeout: parseInt(process.env.LDAP_CONNECT_TIMEOUT || 0, 10),
    socketPath: SOCKET,
    log: LOG
  });
  setupClient.on('setup', (clt, cb) => {
    clt.bind(BIND_DN, BIND_PW, (err) => {
      t.ifError(err);
      cb(err);
    });
  });
  setupClient.search(SUFFIX, { scope: 'base' }, (err, res) => {
    t.ifError(err);
    t.ok(res);
    res.on('end', () => {
      setupClient.destroy();
      t.end();
    });
  });
});

test('setup reconnect', (t) => {
  const rClient = ldap.createClient({
    connectTimeout: parseInt(process.env.LDAP_CONNECT_TIMEOUT || 0, 10),
    socketPath: SOCKET,
    reconnect: true,
    log: LOG
  });
  rClient.on('setup', (clt, cb) => {
    clt.bind(BIND_DN, BIND_PW, (err) => {
      t.ifError(err);
      cb(err);
    });
  });

  function doSearch(_, cb) {
    rClient.search(SUFFIX, { scope: 'base' }, (err, res) => {
      t.ifError(err);
      res.on('end', () => {
        cb();
      });
    });
  }
  vasync.pipeline({ funcs: [
    doSearch,
    function cleanDisconnect(_, cb) {
      t.ok(rClient.connected);
      rClient.once('close', (hadError) => {
        t.ifError(hadError);
        t.equal(rClient.connected, false);
        cb();
      });
      rClient.unbind();
    },
    doSearch,
    function simulateError(_, cb) {
      const msg = 'fake socket error';
      rClient.once('error', (err) => {
        t.equal(err.message, msg);
        t.ok(err);
      });
      rClient.once('close', () => {
        cb();
      });
      rClient._socket.emit('error', new Error(msg));
    },
    doSearch
  ] }, (err) => {
    t.ifError(err);
    rClient.destroy();
    t.end();
  });
});

test('setup abort', (t) => {
  const setupClient = ldap.createClient({
    connectTimeout: parseInt(process.env.LDAP_CONNECT_TIMEOUT || 0, 10),
    socketPath: SOCKET,
    reconnect: true,
    log: LOG
  });
  const message = 'It\'s a trap!';
  setupClient.on('setup', (clt, cb) => {
    // simulate failure
    t.ok(clt);
    cb(new Error(message));
  });
  setupClient.on('setupError', (err) => {
    t.ok(true);
    t.equal(err.message, message);
    setupClient.destroy();
    t.end();
  });
});

test('abort reconnect', (t) => {
  const abortClient = ldap.createClient({
    connectTimeout: parseInt(process.env.LDAP_CONNECT_TIMEOUT || 0, 10),
    socketPath: '/dev/null',
    reconnect: true,
    log: LOG
  });
  let retryCount = 0;
  abortClient.on('connectError', () => {
    ++retryCount;
  });
  abortClient.once('connectError', () => {
    t.ok(true);
    abortClient.once('destroy', () => {
      t.ok(retryCount < 3);
      t.end();
    });
    abortClient.destroy();
  });
});

test('reconnect max retries', (t) => {
  const RETRIES = 5;
  const rClient = ldap.createClient({
    connectTimeout: 100,
    socketPath: '/dev/null',
    reconnect: {
      failAfter: RETRIES,
      // Keep the test duration low
      initialDelay: 10,
      maxDelay: 100
    },
    log: LOG
  });
  let count = 0;
  rClient.on('connectError', () => {
    count++;
  });
  rClient.on('error', () => {
    t.equal(count, RETRIES);
    rClient.destroy();
    t.end();
  });
});

test('reconnect on server close', (t) => {
  const clt = ldap.createClient({
    socketPath: SOCKET,
    reconnect: true,
    log: LOG
  });
  clt.on('setup', (sclt, cb) => {
    sclt.bind(BIND_DN, BIND_PW, (err) => {
      t.ifError(err);
      cb(err);
    });
  });
  clt.once('connect', () => {
    t.ok(clt._socket);
    clt.once('connect', () => {
      t.ok(true, 'successful reconnect');
      clt.destroy();
      t.end();
    });

    // Simulate server-side close
    clt._socket.destroy();
  });
});

test('no auto-reconnect on unbind', (t) => {
  const clt = ldap.createClient({
    socketPath: SOCKET,
    reconnect: true,
    log: LOG
  });
  clt.on('setup', (sclt, cb) => {
    sclt.bind(BIND_DN, BIND_PW, (err) => {
      t.ifError(err);
      cb(err);
    });
  });
  clt.once('connect', () => {
    clt.once('connect', () => {
      t.ifError(new Error('client should not reconnect'));
    });
    clt.once('close', () => {
      t.ok(true, 'initial close');
      setImmediate(() => {
        t.ok(!clt.connected, 'should not be connected');
        t.ok(!clt.connecting, 'should not be connecting');
        clt.destroy();
        t.end();
      });
    });

    clt.unbind();
  });
});

test('abandon (GH-27)', (t) => {
  client.abandon(401876543, (err) => {
    t.ifError(err);
    t.end();
  });
});

test('search timeout (GH-51)', (t) => {
  client.timeout = 250;
  client.search('dc=timeout', 'objectclass=*', (err, res) => {
    t.ifError(err);
    res.on('error', () => {
      t.end();
    });
  });
});

test('resultError handling', (t) => {
  t.plan(6);
  vasync.pipeline({ funcs: [
    function errSearch(_, cb) {
      client.once('resultError', (error) => {
        t.equal(error.name, 'BusyError');
      });
      client.search('cn=busy', {}, (err, res) => {
        t.ifError(err);

        res.once('error', (error) => {
          t.equal(error.name, 'BusyError');
          cb();
        });
      });
    },
    function cleanSearch(_, cb) {
      client.on('resultError', t.ifError.bind(null));
      client.search(SUFFIX, {}, (err, res) => {
        t.ifError(err);

        res.once('end', () => {
          t.ok(true);
          cb();
        });
      });
    }
  ] }, (err) => {
    t.ifError(err);
    client.removeAllListeners('resultError');
  });
});

test('unbind (GH-30)', (t) => {
  client.unbind((err) => {
    t.ifError(err);
    t.end();
  });
});

test('shutdown', (t) => {
  server.on('close', () => {
    t.end();
  });
  server.close();
});
