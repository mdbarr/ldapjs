// Copyright 2011 Mark Cavage, Inc.  All rights reserved.
'use strict';

const Logger = require('bunyan');

const async = require('async');
const { v4: uuid } = require('uuid');
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
  src: true,
});

let ldap;
let Attribute;
let Change;
let client;
let server;

////////////////////
// Tests

test('setup', done => {
  ldap = require('../lib/index');
  expect(ldap).toBeTruthy();
  expect(ldap.createClient).toBeTruthy();
  expect(ldap.createServer).toBeTruthy();
  expect(ldap.Attribute).toBeTruthy();
  expect(ldap.Change).toBeTruthy();

  Attribute = ldap.Attribute;
  Change = ldap.Change;

  server = ldap.createServer();
  expect(server).toBeTruthy();

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
        'faster': '.',
      },
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
          'gb18030': Buffer.from([ 0xB5, 0xE7, 0xCA, 0xD3, 0xBB, 0xFA ]),
          'objectclass': 'binary',
        },
      }));
    } else {
      const e = res.createSearchEntry({
        objectName: req.dn,
        attributes: {
          cn: [ 'unit', 'test' ],
          SN: 'testy',
        },
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
          objectclass: [ 'pagedResult' ],
        },
      });
    }
    res.end();
    return next();
  });

  server.search('cn=paged', (req, res, next) => {
    const min = 0;
    const max = 1000;

    function sendResults (start, end) {
      start = start < min ? min : start;
      end = end > max || end < min ? max : end;
      let i;
      for (i = start; i < end; i++) {
        res.send({
          dn: util.format('o=%d, cn=paged', i),
          attributes: {
            o: [ i ],
            objectclass: [ 'pagedResult' ],
          },
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
        resultCookie = Buffer.from(last.toString());
      } else {
        resultCookie = Buffer.from('');
      }
      res.controls.push(new ldap.PagedResultsControl({
        value: {
          size: pageSize, // correctness not required here
          cookie: resultCookie,
        },
      }));
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
          objectclass: [ 'pagedResult' ],
        },
      });
      res.controls.push(new ldap.PagedResultsControl({
        value: {
          size: 2,
          cookie: Buffer.from('a'),
        },
      }));
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
        'member;range=0-1': [ 'cn=user1, dc=empty', 'cn=user2, dc=empty' ],
      },
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
        attributes: { objectclass: [ 'RootDSE', 'top' ] },
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
      log: LOG,
    });
    expect(client).toBeTruthy();
    done();
  });
});

test('simple bind failure', done => {
  client.bind(BIND_DN, uuid(), (err, res) => {
    expect(err).toBeTruthy();
    expect(res).toBeFalsy();

    expect(err instanceof ldap.InvalidCredentialsError).toBeTruthy();
    expect(err instanceof Error).toBeTruthy();
    expect(err.dn).toBeTruthy();
    expect(err.message).toBeTruthy();
    expect(err.stack).toBeTruthy();

    done();
  });
});

test('simple bind success', done => {
  client.bind(BIND_DN, BIND_PW, (err, res) => {
    expect(err).toBeFalsy();
    expect(res).toBeTruthy();
    expect(res.status).toBe(0);
    done();
  });
});

test('simple anonymous bind (empty credentials)', done => {
  client.bind('', '', (err, res) => {
    expect(err).toBeFalsy();
    expect(res).toBeTruthy();
    expect(res.status).toBe(0);
    done();
  });
});

test('auto-bind bad credentials', done => {
  const clt = ldap.createClient({
    socketPath: SOCKET,
    bindDN: BIND_DN,
    bindCredentials: 'totallybogus',
    log: LOG,
  });
  clt.once('error', (err) => {
    expect(err.code).toBe(ldap.LDAP_INVALID_CREDENTIALS);
    clt.destroy();
    done();
  });
});

test('auto-bind success', done => {
  const clt = ldap.createClient({
    socketPath: SOCKET,
    bindDN: BIND_DN,
    bindCredentials: BIND_PW,
    log: LOG,
  });
  clt.once('connect', () => {
    expect(clt).toBeTruthy();
    clt.destroy();
    done();
  });
});

test('add success', done => {
  const attrs = [
    new Attribute({
      type: 'cn',
      vals: [ 'test' ],
    }),
  ];
  client.add(`cn=add, ${ SUFFIX }`, attrs, (err, res) => {
    expect(err).toBeFalsy();
    expect(res).toBeTruthy();
    expect(res.status).toBe(0);
    done();
  });
});

test('add success with object', done => {
  const entry = {
    cn: [ 'unit', 'add' ],
    sn: 'test',
  };
  client.add(`cn=add, ${ SUFFIX }`, entry, (err, res) => {
    expect(err).toBeFalsy();
    expect(res).toBeTruthy();
    expect(res.status).toBe(0);
    done();
  });
});

test('compare success', done => {
  client.compare(`cn=compare, ${ SUFFIX }`, 'cn', 'test', (err,
    matched,
    res) => {
    expect(err).toBeFalsy();
    expect(matched).toBeTruthy();
    expect(res).toBeTruthy();
    done();
  });
});

test('compare false', done => {
  client.compare(`cn=compare, ${ SUFFIX }`, 'cn', 'foo', (err,
    matched,
    res) => {
    expect(err).toBeFalsy();
    expect(matched).toBeFalsy();
    expect(res).toBeTruthy();
    done();
  });
});

test('compare bad suffix', done => {
  client.compare(`cn=${ uuid() }`, 'cn', 'foo', (err,
    matched,
    res) => {
    expect(err).toBeTruthy();
    expect(err instanceof ldap.NoSuchObjectError).toBeTruthy();
    expect(matched).toBeFalsy();
    expect(res).toBeFalsy();
    done();
  });
});

test('delete success', done => {
  client.del(`cn=delete, ${ SUFFIX }`, (err, res) => {
    expect(err).toBeFalsy();
    expect(res).toBeTruthy();
    done();
  });
});

test('delete with control (GH-212)', done => {
  const control = new ldap.Control({
    type: '1.2.3.4',
    criticality: false,
  });
  client.del(`cn=delete, ${ SUFFIX }`, control, (err, res) => {
    expect(err).toBeFalsy();
    expect(res).toBeTruthy();
    done();
  });
});

test('exop success', done => {
  client.exop('1.3.6.1.4.1.4203.1.11.3', (err, value, res) => {
    expect(err).toBeFalsy();
    expect(value).toBeTruthy();
    expect(res).toBeTruthy();
    expect(value).toBe('u:xxyyz@EXAMPLE.NET');
    done();
  });
});

test('exop invalid', done => {
  client.exop('1.2.3.4', (err, res) => {
    expect(err).toBeTruthy();
    expect(err instanceof ldap.ProtocolError).toBeTruthy();
    expect(res).toBeFalsy();
    done();
  });
});

test('bogus exop (GH-17)', done => {
  client.exop('cn=root', (err) => {
    expect(err).toBeTruthy();
    done();
  });
});

test('modify success', done => {
  const change = new Change({
    type: 'Replace',
    modification: new Attribute({
      type: 'cn',
      vals: [ 'test' ],
    }),
  });
  client.modify(`cn=modify, ${ SUFFIX }`, change, (err, res) => {
    expect(err).toBeFalsy();
    expect(res).toBeTruthy();
    expect(res.status).toBe(0);
    done();
  });
});

test('modify change plain object success', done => {
  const change = new Change({
    type: 'Replace',
    modification: { cn: 'test' },
  });
  client.modify(`cn=modify, ${ SUFFIX }`, change, (err, res) => {
    expect(err).toBeFalsy();
    expect(res).toBeTruthy();
    expect(res.status).toBe(0);
    done();
  });
});

test('modify array success', done => {
  const changes = [
    new Change({
      operation: 'Replace',
      modification: new Attribute({
        type: 'cn',
        vals: [ 'test' ],
      }),
    }),
    new Change({
      operation: 'Delete',
      modification: new Attribute({ type: 'sn' }),
    }),
  ];
  client.modify(`cn=modify, ${ SUFFIX }`, changes, (err, res) => {
    expect(err).toBeFalsy();
    expect(res).toBeTruthy();
    expect(res.status).toBe(0);
    done();
  });
});

test('modify change plain object success (GH-31)', done => {
  const change = {
    type: 'replace',
    modification: {
      cn: 'test',
      sn: 'bar',
    },
  };
  client.modify(`cn=modify, ${ SUFFIX }`, change, (err, res) => {
    expect(err).toBeFalsy();
    expect(res).toBeTruthy();
    expect(res.status).toBe(0);
    done();
  });
});

test('modify DN new RDN only', done => {
  client.modifyDN(`cn=old, ${ SUFFIX }`, 'cn=new', (err, res) => {
    expect(err).toBeFalsy();
    expect(res).toBeTruthy();
    expect(res.status).toBe(0);
    done();
  });
});

test('modify DN new superior', done => {
  client.modifyDN(`cn=old, ${ SUFFIX }`, 'cn=new, dc=foo', (err, res) => {
    expect(err).toBeFalsy();
    expect(res).toBeTruthy();
    expect(res.status).toBe(0);
    done();
  });
});

test('search basic', done => {
  client.search(`cn=test, ${ SUFFIX }`, '(objectclass=*)', (err, res) => {
    expect(err).toBeFalsy();
    expect(res).toBeTruthy();
    let gotEntry = 0;
    res.on('searchEntry', (entry) => {
      expect(entry).toBeTruthy();
      expect(entry instanceof ldap.SearchEntry).toBeTruthy();
      expect(entry.dn.toString()).toBe(`cn=test, ${ SUFFIX }`);
      expect(entry.attributes).toBeTruthy();
      expect(entry.attributes.length).toBeTruthy();
      expect(entry.attributes[0].type).toBe('cn');
      expect(entry.attributes[1].type).toBe('SN');
      expect(entry.object).toBeTruthy();
      gotEntry++;
    });
    res.on('error', (err) => {
      done.fail(err);
    });
    res.on('end', (res) => {
      expect(res).toBeTruthy();
      expect(res instanceof ldap.SearchResponse).toBeTruthy();
      expect(res.status).toBe(0);
      expect(gotEntry).toBe(2);
      done();
    });
  });
});

describe('search sizeLimit', () => {
  test('over limit', (done) => {
    client.search('cn=sizelimit', {}, (err, res) => {
      expect(err).toBeFalsy();
      res.on('error', (error) => {
        expect(error.name).toBe('SizeLimitExceededError');
        done();
      });
    });
  });

  test('under limit', (done) => {
    const limit = 100;
    client.search('cn=sizelimit', { sizeLimit: limit }, (err, res) => {
      expect(err).toBeFalsy();
      let count = 0;
      res.on('searchEntry', () => {
        count++;
      });
      res.on('end', () => {
        expect(count).toEqual(limit);
        done();
      });
      res.on('error', (error) => {
        throw error;
      });
    });
  });
});

describe('search paged', () => {
  test('paged - no pauses', (done) => {
    let countEntries = 0;
    let countPages = 0;
    client.search('cn=paged', { paged: { pageSize: 100 } }, (err, res) => {
      expect(err).toBeFalsy();
      res.on('searchEntry', () => {
        countEntries++;
      });

      res.on('page', () => {
        countPages++;
      });

      res.on('error', (error) => {
        throw error;
      });

      res.on('end', () => {
        expect(countEntries).toEqual(1000);
        expect(countPages).toEqual(10);
        done();
      });
    });
  });

  test('paged - pauses', (done) => {
    let countPages = 0;
    client.search('cn=paged', {
      paged: {
        pageSize: 100,
        pagePause: true,
      },
    }, (err, res) => {
      expect(err).toBeFalsy();
      res.on('page', (result, cb) => {
        countPages++;
        // cancel after 9 to verify callback usage
        if (countPages === 9) {
          // another page should never be encountered
          res.removeAllListeners('page').
            on('page', () => {
              throw new Error('Unexpected page');
            });

          return cb(new Error());
        }
        return cb();
      });

      res.on('error', (error) => {
        throw error;
      });

      res.on('end', () => {
        expect(countPages).toEqual(9);
        done();
      });
    });
  });

  test('paged - no support (err handled)', (done) => {
    client.search(SUFFIX, { paged: { pageSize: 100 } }, (err, res) => {
      expect(err).toBeFalsy();

      res.on('pageError', (error) => {
        expect(error).toBeTruthy();
      });

      res.on('end', () => {
        done();
      });
    });
  });

  test('paged - no support (err not handled)', (done) => {
    client.search(SUFFIX, { paged: { pageSize: 100 } }, (err, res) => {
      expect(err).toBeFalsy();

      res.on('end', () => {
        done.fail('Unespected end');
      });

      res.on('error', (error) => {
        expect(error).toBeTruthy();
        done();
      });
    });
  });

  test('paged - redundant control', (done) => {
    try {
      client.search(SUFFIX,
        { paged: { pageSize: 100 } },
        new ldap.PagedResultsControl(),
        (err) => {
          expect(err).toBeFalsy();
        });
    } catch (e) {
      expect(e).toBeTruthy();
      done();
    }
  });

  test('paged - handle later error', (done) => {
    let countEntries = 0;
    let countPages = 0;
    client.search('cn=pagederr', { paged: { pageSize: 1 } }, (err, res) => {
      expect(err).toBeFalsy();
      res.on('searchEntry', () => {
        expect(++countEntries).toBeTruthy();
      });
      res.on('page', () => {
        expect(++countPages).toBeTruthy();
      });
      res.on('error', () => {
        expect(countEntries).toEqual(1);
        expect(countPages).toEqual(1);
        done();
      });
      res.on('end', () => {
        done.fail('should not be reached');
      });
    });
  });
});

test('search referral', done => {
  client.search(`cn=ref, ${ SUFFIX }`, '(objectclass=*)', (err, res) => {
    expect(err).toBeFalsy();
    expect(res).toBeTruthy();
    let gotEntry = 0;
    let gotReferral = false;
    res.on('searchEntry', () => {
      gotEntry++;
    });
    res.on('searchReference', (referral) => {
      gotReferral = true;
      expect(referral).toBeTruthy();
      expect(referral instanceof ldap.SearchReference).toBeTruthy();
      expect(referral.uris).toBeTruthy();
      expect(referral.uris.length).toBeTruthy();
    });
    res.on('error', (err) => {
      done.fail(err);
    });
    res.on('end', (res) => {
      expect(res).toBeTruthy();
      expect(res instanceof ldap.SearchResponse).toBeTruthy();
      expect(res.status).toBe(0);
      expect(gotEntry).toBe(0);
      expect(gotReferral).toBeTruthy();
      done();
    });
  });
});

test('search rootDSE', done => {
  client.search('', '(objectclass=*)', (err, res) => {
    expect(err).toBeFalsy();
    expect(res).toBeTruthy();
    res.on('searchEntry', (entry) => {
      expect(entry).toBeTruthy();
      expect(entry.dn.toString()).toBe('');
      expect(entry.attributes).toBeTruthy();
      expect(entry.object).toBeTruthy();
    });
    res.on('error', (err) => {
      done.fail(err);
    });
    res.on('end', (res) => {
      expect(res).toBeTruthy();
      expect(res instanceof ldap.SearchResponse).toBeTruthy();
      expect(res.status).toBe(0);
      done();
    });
  });
});

test('search empty attribute', done => {
  client.search('dc=empty', '(objectclass=*)', (err, res) => {
    expect(err).toBeFalsy();
    expect(res).toBeTruthy();
    let gotEntry = 0;
    res.on('searchEntry', (entry) => {
      const obj = entry.toObject();
      expect('dc=empty').toBe(obj.dn);
      expect(obj.member).toBeTruthy();
      expect(obj.member.length).toBe(0);
      expect(obj['member;range=0-1']).toBeTruthy();
      expect(obj['member;range=0-1'].length).toBeTruthy();
      gotEntry++;
    });
    res.on('error', (err) => {
      done.fail(err);
    });
    res.on('end', (res) => {
      expect(res).toBeTruthy();
      expect(res instanceof ldap.SearchResponse).toBeTruthy();
      expect(res.status).toBe(0);
      expect(gotEntry).toBe(1);
      done();
    });
  });
});

test('GH-21 binary attributes', done => {
  client.search(`cn=bin, ${ SUFFIX }`, '(objectclass=*)', (err, res) => {
    expect(err).toBeFalsy();
    expect(res).toBeTruthy();
    let gotEntry = 0;
    const expected = Buffer.from('\u00bd + \u00bc = \u00be', 'utf8');
    const expected2 = Buffer.from([ 0xB5, 0xE7, 0xCA, 0xD3, 0xBB, 0xFA ]);
    res.on('searchEntry', (entry) => {
      expect(entry).toBeTruthy();
      expect(entry instanceof ldap.SearchEntry).toBeTruthy();
      expect(entry.dn.toString()).toBe(`cn=bin, ${ SUFFIX }`);
      expect(entry.attributes).toBeTruthy();
      expect(entry.attributes.length).toBeTruthy();
      expect(entry.attributes[0].type).toBe('foo;binary');
      expect(entry.attributes[0].vals[0]).toBe(expected.toString('base64'));
      expect(entry.attributes[0].buffers[0].toString('base64')).toBe(expected.toString('base64'));

      expect(entry.attributes[1].type).toBeTruthy();
      expect(entry.attributes[1].buffers.length).toBe(1);
      expect(expected2.length).toBe(entry.attributes[1].buffers[0].length);
      for (let i = 0; i < expected2.length; i++) { expect(expected2[i]).toBe(entry.attributes[1].buffers[0][i]); }

      expect(entry.object).toBeTruthy();
      gotEntry++;
    });

    res.on('error', (err) => {
      done.fail(err);
    });

    res.on('end', (res) => {
      expect(res).toBeTruthy();
      expect(res instanceof ldap.SearchResponse).toBeTruthy();
      expect(res.status).toBe(0);
      expect(gotEntry).toBe(1);
      done();
    });
  });
});

test('GH-23 case insensitive attribute filtering', done => {
  const opts = {
    filter: '(objectclass=*)',
    attributes: [ 'Cn' ],
  };
  client.search(`cn=test, ${ SUFFIX }`, opts, (err, res) => {
    expect(err).toBeFalsy();
    expect(res).toBeTruthy();
    let gotEntry = 0;
    res.on('searchEntry', (entry) => {
      expect(entry).toBeTruthy();
      expect(entry instanceof ldap.SearchEntry).toBeTruthy();
      expect(entry.dn.toString()).toBe(`cn=test, ${ SUFFIX }`);
      expect(entry.attributes).toBeTruthy();
      expect(entry.attributes.length).toBeTruthy();
      expect(entry.attributes[0].type).toBe('cn');
      expect(entry.object).toBeTruthy();
      gotEntry++;
    });
    res.on('error', (err) => {
      done.fail(err);
    });
    res.on('end', (res) => {
      expect(res).toBeTruthy();
      expect(res instanceof ldap.SearchResponse).toBeTruthy();
      expect(res.status).toBe(0);
      expect(gotEntry).toBe(2);
      done();
    });
  });
});

test('GH-24 attribute selection of *', done => {
  const opts = {
    filter: '(objectclass=*)',
    attributes: [ '*' ],
  };
  client.search(`cn=test, ${ SUFFIX }`, opts, (err, res) => {
    expect(err).toBeFalsy();
    expect(res).toBeTruthy();
    let gotEntry = 0;
    res.on('searchEntry', (entry) => {
      expect(entry).toBeTruthy();
      expect(entry instanceof ldap.SearchEntry).toBeTruthy();
      expect(entry.dn.toString()).toBe(`cn=test, ${ SUFFIX }`);
      expect(entry.attributes).toBeTruthy();
      expect(entry.attributes.length).toBeTruthy();
      expect(entry.attributes[0].type).toBe('cn');
      expect(entry.attributes[1].type).toBe('SN');
      expect(entry.object).toBeTruthy();
      gotEntry++;
    });
    res.on('error', (err) => {
      done.fail(err);
    });
    res.on('end', (res) => {
      expect(res).toBeTruthy();
      expect(res instanceof ldap.SearchResponse).toBeTruthy();
      expect(res.status).toBe(0);
      expect(gotEntry).toBe(2);
      done();
    });
  });
});

test('idle timeout', done => {
  client.idleTimeout = 250;
  function premature () {
    expect(true).toBeFalsy();
  }
  client.on('idle', premature);
  client.search('dc=slow', 'objectclass=*', (err, res) => {
    expect(err).toBeFalsy();
    res.on('searchEntry', (res) => {
      expect(res).toBeTruthy();
    });
    res.on('error', (err) => {
      expect(err).toBeFalsy();
    });
    res.on('end', () => {
      const late = setTimeout(() => {
        expect(false).toBeFalsy();
      }, 500);
      // It's ok to go idle now
      client.removeListener('idle', premature);
      client.on('idle', () => {
        clearTimeout(late);
        client.removeAllListeners('idle');
        client.idleTimeout = 0;
        done();
      });
    });
  });
});

test('setup action', done => {
  const setupClient = ldap.createClient({
    connectTimeout: parseInt(process.env.LDAP_CONNECT_TIMEOUT || 0, 10),
    socketPath: SOCKET,
    log: LOG,
  });
  setupClient.on('setup', (clt, cb) => {
    clt.bind(BIND_DN, BIND_PW, (err) => {
      expect(err).toBeFalsy();
      cb(err);
    });
  });
  setupClient.search(SUFFIX, { scope: 'base' }, (err, res) => {
    expect(err).toBeFalsy();
    expect(res).toBeTruthy();
    res.on('end', () => {
      setupClient.destroy();
      done();
    });
  });
});

test('setup reconnect', done => {
  const rClient = ldap.createClient({
    connectTimeout: parseInt(process.env.LDAP_CONNECT_TIMEOUT || 0, 10),
    socketPath: SOCKET,
    reconnect: true,
    log: LOG,
  });
  rClient.on('setup', (clt, cb) => {
    clt.bind(BIND_DN, BIND_PW, (err) => {
      expect(err).toBeFalsy();
      cb(err);
    });
  });

  function doSearch (cb) {
    rClient.search(SUFFIX, { scope: 'base' }, (err, res) => {
      expect(err).toBeFalsy();
      res.on('end', () => {
        cb();
      });
    });
  }
  async.series([
    doSearch,
    function cleanDisconnect (cb) {
      expect(rClient.connected).toBeTruthy();
      rClient.once('close', (hadError) => {
        expect(hadError).toBeFalsy();
        expect(rClient.connected).toBe(false);
        cb();
      });
      rClient.unbind();
    },
    doSearch,
    function simulateError (cb) {
      const msg = 'fake socket error';
      rClient.once('error', (err) => {
        expect(err.message).toBe(msg);
        expect(err).toBeTruthy();
      });
      rClient.once('close', () => {
        cb();
      });
      rClient._socket.emit('error', new Error(msg));
    },
    doSearch,
  ], (err) => {
    expect(err).toBeFalsy();
    rClient.destroy();
    done();
  });
});

test('setup abort', done => {
  const setupClient = ldap.createClient({
    connectTimeout: parseInt(process.env.LDAP_CONNECT_TIMEOUT || 0, 10),
    socketPath: SOCKET,
    reconnect: true,
    log: LOG,
  });
  const message = 'It\'s a trap!';
  setupClient.on('setup', (clt, cb) => {
    // simulate failure
    expect(clt).toBeTruthy();
    cb(new Error(message));
  });
  setupClient.on('setupError', (err) => {
    expect(true).toBeTruthy();
    expect(err.message).toBe(message);
    setupClient.destroy();
    done();
  });
});

test('abort reconnect', done => {
  const abortClient = ldap.createClient({
    connectTimeout: parseInt(process.env.LDAP_CONNECT_TIMEOUT || 0, 10),
    socketPath: '/dev/null',
    reconnect: true,
    log: LOG,
  });
  let retryCount = 0;
  abortClient.on('connectError', () => {
    ++retryCount;
  });
  abortClient.once('connectError', () => {
    expect(true).toBeTruthy();
    abortClient.once('destroy', () => {
      expect(retryCount < 3).toBeTruthy();
      done();
    });
    abortClient.destroy();
  });
});

test('reconnect max retries', done => {
  const RETRIES = 5;
  const rClient = ldap.createClient({
    connectTimeout: 100,
    socketPath: '/dev/null',
    reconnect: {
      failAfter: RETRIES,
      // Keep the test duration low
      initialDelay: 10,
      maxDelay: 100,
    },
    log: LOG,
  });
  let count = 0;
  rClient.on('connectError', () => {
    count++;
  });
  rClient.on('error', () => {
    expect(count).toBe(RETRIES);
    rClient.destroy();
    done();
  });
});

test('reconnect on server close', done => {
  const clt = ldap.createClient({
    socketPath: SOCKET,
    reconnect: true,
    log: LOG,
  });
  clt.on('setup', (sclt, cb) => {
    sclt.bind(BIND_DN, BIND_PW, (err) => {
      expect(err).toBeFalsy();
      cb(err);
    });
  });
  clt.once('connect', () => {
    expect(clt._socket).toBeTruthy();
    clt.once('connect', () => {
      expect(true).toBeTruthy();
      clt.destroy();
      done();
    });

    // Simulate server-side close
    clt._socket.destroy();
  });
});

test('no auto-reconnect on unbind', done => {
  const clt = ldap.createClient({
    socketPath: SOCKET,
    reconnect: true,
    log: LOG,
  });
  clt.on('setup', (sclt, cb) => {
    sclt.bind(BIND_DN, BIND_PW, (err) => {
      expect(err).toBeFalsy();
      cb(err);
    });
  });
  clt.once('connect', () => {
    clt.once('connect', () => {
      expect(new Error('client should not reconnect')).toBeFalsy();
    });
    clt.once('close', () => {
      expect(true).toBeTruthy();
      setImmediate(() => {
        expect(!clt.connected).toBeTruthy();
        expect(!clt.connecting).toBeTruthy();
        clt.destroy();
        done();
      });
    });

    clt.unbind();
  });
});

test('abandon (GH-27)', done => {
  client.abandon(401876543, (err) => {
    expect(err).toBeFalsy();
    done();
  });
});

test('search timeout (GH-51)', done => {
  client.timeout = 250;
  client.search('dc=timeout', 'objectclass=*', (err, res) => {
    expect(err).toBeFalsy();
    res.on('error', () => {
      done();
    });
  });
});

test('resultError handling', (done) => {
  async.series([
    function errSearch (cb) {
      client.once('resultError', (error) => {
        expect(error.name).toBe('BusyError');
      });
      client.search('cn=busy', {}, (err, res) => {
        expect(err).toBeFalsy();

        res.once('error', (error) => {
          expect(error.name).toBe('BusyError');
          cb();
        });
      });
    },
    function cleanSearch (cb) {
      client.on('resultError', (error) => {
        throw error;
      });

      client.search(SUFFIX, {}, (err, res) => {
        expect(err).toBeFalsy();

        res.once('end', () => {
          expect(true).toBeTruthy();
          cb();
        });
      });
    },
  ], (err) => {
    expect(err).toBeFalsy();
    client.removeAllListeners('resultError');
    done();
  });
});

test('unbind (GH-30)', done => {
  client.unbind((err) => {
    expect(err).toBeFalsy();
    done();
  });
});

test('shutdown', done => {
  server.on('close', () => {
    done();
  });
  server.close();
});
