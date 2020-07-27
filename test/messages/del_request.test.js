// Copyright 2011 Mark Cavage, Inc.  All rights reserved.
'use strict';

const asn1 = require('asn1');
const Logger = require('bunyan');

////////////////////
// Globals

const BerReader = asn1.BerReader;
const BerWriter = asn1.BerWriter;
let DeleteRequest;
let dn;

////////////////////
// Tests

test('load library', () => {
  DeleteRequest = require('../../lib/index').DeleteRequest;
  dn = require('../../lib/index').dn;
  expect(DeleteRequest).toBeTruthy();
});

test('new no args', () => {
  expect(new DeleteRequest()).toBeTruthy();
});

test('new with args', () => {
  const req = new DeleteRequest({ entry: dn.parse('cn=test') });
  expect(req).toBeTruthy();
  expect(req.dn.toString()).toBe('cn=test');
});

test('parse', () => {
  const ber = new BerWriter();
  ber.writeString('cn=test', 0x4a);

  const req = new DeleteRequest({ log: new Logger({ name: 'del_request.test.js' }) });
  const reader = new BerReader(ber.buffer);
  reader.readSequence(0x4a);
  expect(req.parse(reader, reader.length)).toBeTruthy();
  expect(req.dn.toString()).toBe('cn=test');
});

test('toBer', () => {
  const req = new DeleteRequest({
    messageID: 123,
    entry: dn.parse('cn=test'),
  });
  expect(req).toBeTruthy();

  const ber = new BerReader(req.toBer());
  expect(ber).toBeTruthy();
  expect(ber.readSequence()).toBe(0x30);
  expect(ber.readInt()).toBe(123);
  expect(ber.readString(0x4a)).toBe('cn=test');
});
