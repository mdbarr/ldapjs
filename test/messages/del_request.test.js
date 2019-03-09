// Copyright 2011 Mark Cavage, Inc.  All rights reserved.
'use strict';

const asn1 = require('asn1');
const Logger = require('bunyan');
const test = require('tape').test;

////////////////////
// Globals

const BerReader = asn1.BerReader;
const BerWriter = asn1.BerWriter;
let DeleteRequest;
let dn;

////////////////////
// Tests

test('load library', (t) => {
  DeleteRequest = require('../../lib/index').DeleteRequest;
  dn = require('../../lib/index').dn;
  t.ok(DeleteRequest);
  t.end();
});

test('new no args', (t) => {
  t.ok(new DeleteRequest());
  t.end();
});

test('new with args', (t) => {
  const req = new DeleteRequest({ entry: dn.parse('cn=test') });
  t.ok(req);
  t.equal(req.dn.toString(), 'cn=test');
  t.end();
});

test('parse', (t) => {
  const ber = new BerWriter();
  ber.writeString('cn=test', 0x4a);

  const req = new DeleteRequest({ log: new Logger({ name: 'del_request.test.js' }) });
  const reader = new BerReader(ber.buffer);
  reader.readSequence(0x4a);
  t.ok(req.parse(reader, reader.length));
  t.equal(req.dn.toString(), 'cn=test');
  t.end();
});

test('toBer', (t) => {
  const req = new DeleteRequest({
    messageID: 123,
    entry: dn.parse('cn=test')
  });
  t.ok(req);

  const ber = new BerReader(req.toBer());
  t.ok(ber);
  t.equal(ber.readSequence(), 0x30);
  t.equal(ber.readInt(), 123);
  t.equal(ber.readString(0x4a), 'cn=test');

  t.end();
});
