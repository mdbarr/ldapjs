// Copyright 2014 Joyent, Inc.  All rights reserved.
'use strict';

const bunyan = require('bunyan');

////////////////////
// Globals

let lib;
let Parser;
const LOG = bunyan.createLogger({ name: 'ldapjs-test' });

////////////////////
// Tests
test('load library', () => {
  lib = require('../../lib/');
  Parser = lib.Parser;

  expect(Parser).toBeTruthy();
});

test('wrong protocol error', done => {
  const p = new Parser({ log: LOG });

  p.once('error', (err) => {
    expect(err).toBeTruthy();
    done();
  });

  // Send some bogus data to incur an error
  p.write(Buffer.from([ 16, 1, 4 ]));
});

test('bad protocol op', done => {
  const p = new Parser({ log: LOG });
  const message = new lib.LDAPMessage({ protocolOp: 254 });// bogus (at least today)
  p.once('error', (err) => {
    expect(err).toBeTruthy();
    expect(/not supported$/.test(err.message)).toBeTruthy();
    done();
  });
  p.write(message.toBer());
});

test('bad message structure', done => {
  const p = new Parser({ log: LOG });

  // message with bogus structure
  const message = new lib.LDAPMessage({ protocolOp: lib.LDAP_REQ_EXTENSION });
  message._toBer = function (writer) {
    writer.writeBuffer(Buffer.from([ 16, 1, 4 ]), 80);
    return writer;
  };

  p.once('error', (err) => {
    expect(err).toBeTruthy();
    done();
  });

  p.write(message.toBer());
});
