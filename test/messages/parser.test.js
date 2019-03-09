// Copyright 2014 Joyent, Inc.  All rights reserved.
'use strict';

const test = require('tape').test;
const bunyan = require('bunyan');

////////////////////
// Globals

let lib;
let Parser;
const LOG = bunyan.createLogger({ name: 'ldapjs-test' });

////////////////////
// Tests
test('load library', (t) => {
  lib = require('../../lib/');
  Parser = lib.Parser;

  t.ok(Parser);
  t.end();
});

test('wrong protocol error', (t) => {
  const p = new Parser({ log: LOG });

  p.once('error', (err) => {
    t.ok(err);
    t.end();
  });

  // Send some bogus data to incur an error
  p.write(new Buffer([ 16, 1, 4 ]));
});

test('bad protocol op', (t) => {
  const p = new Parser({ log: LOG });
  const message = new lib.LDAPMessage({ protocolOp: 254 });// bogus (at least today)
  p.once('error', (err) => {
    t.ok(err);
    t.ok(/not supported$/.test(err.message));
    t.end();
  });
  p.write(message.toBer());
});

test('bad message structure', (t) => {
  const p = new Parser({ log: LOG });

  // message with bogus structure
  const message = new lib.LDAPMessage({ protocolOp: lib.LDAP_REQ_EXTENSION });
  message._toBer = function (writer) {
    writer.writeBuffer(new Buffer([ 16, 1, 4 ]), 80);
    return writer;
  };

  p.once('error', (err) => {
    t.ok(err);
    t.end();
  });

  p.write(message.toBer());
});
