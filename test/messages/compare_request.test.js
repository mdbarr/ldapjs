// Copyright 2011 Mark Cavage, Inc.  All rights reserved.
'use strict';

const asn1 = require('asn1');

////////////////////
// Globals

const BerReader = asn1.BerReader;
const BerWriter = asn1.BerWriter;
let CompareRequest;
let dn;

////////////////////
// Tests

test('load library', () => {
  CompareRequest = require('../../lib/index').CompareRequest;
  dn = require('../../lib/index').dn;
  expect(CompareRequest).toBeTruthy();
  expect(dn).toBeTruthy();
});

test('new no args', () => {
  expect(new CompareRequest()).toBeTruthy();
});

test('new with args', () => {
  const req = new CompareRequest({
    entry: dn.parse('cn=foo, o=test'),
    attribute: 'sn',
    value: 'testy'
  });
  expect(req).toBeTruthy();
  expect(req.dn.toString()).toBe('cn=foo, o=test');
  expect(req.attribute).toBe('sn');
  expect(req.value).toBe('testy');
});

test('parse', () => {
  const ber = new BerWriter();
  ber.writeString('cn=foo, o=test');

  ber.startSequence();
  ber.writeString('sn');
  ber.writeString('testy');
  ber.endSequence();

  const req = new CompareRequest();
  expect(req._parse(new BerReader(ber.buffer))).toBeTruthy();
  expect(req.dn).toBe('cn=foo, o=test');
  expect(req.attribute).toBe('sn');
  expect(req.value).toBe('testy');
});

test('toBer', () => {
  const req = new CompareRequest({
    messageID: 123,
    entry: dn.parse('cn=foo, o=test'),
    attribute: 'sn',
    value: 'testy'
  });

  expect(req).toBeTruthy();

  const ber = new BerReader(req.toBer());
  expect(ber).toBeTruthy();
  expect(ber.readSequence()).toBe(0x30);
  expect(ber.readInt()).toBe(123);
  expect(ber.readSequence()).toBe(0x6e);
  expect(ber.readString()).toBe('cn=foo, o=test');
  expect(ber.readSequence()).toBeTruthy();

  expect(ber.readString()).toBe('sn');
  expect(ber.readString()).toBe('testy');
});
