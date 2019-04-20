// Copyright 2011 Mark Cavage, Inc.  All rights reserved.
'use strict';

const asn1 = require('asn1');

////////////////////
// Globals

const BerReader = asn1.BerReader;
const BerWriter = asn1.BerWriter;
let AddResponse;

////////////////////
// Tests

test('load library', () => {
  AddResponse = require('../../lib/index').AddResponse;
  expect(AddResponse).toBeTruthy();
});

test('new no args', () => {
  expect(new AddResponse()).toBeTruthy();
});

test('new with args', () => {
  const res = new AddResponse({
    messageID: 123,
    status: 0
  });
  expect(res).toBeTruthy();
  expect(res.messageID).toBe(123);
  expect(res.status).toBe(0);
});

test('parse', () => {
  const ber = new BerWriter();
  ber.writeEnumeration(0);
  ber.writeString('cn=root');
  ber.writeString('foo');

  const res = new AddResponse();
  expect(res._parse(new BerReader(ber.buffer))).toBeTruthy();
  expect(res.status).toBe(0);
  expect(res.matchedDN).toBe('cn=root');
  expect(res.errorMessage).toBe('foo');
});

test('toBer', () => {
  const res = new AddResponse({
    messageID: 123,
    status: 3,
    matchedDN: 'cn=root',
    errorMessage: 'foo'
  });
  expect(res).toBeTruthy();

  const ber = new BerReader(res.toBer());
  expect(ber).toBeTruthy();
  expect(ber.readSequence()).toBe(0x30);
  expect(ber.readInt()).toBe(123);
  expect(ber.readSequence()).toBe(0x69);
  expect(ber.readEnumeration()).toBe(3);
  expect(ber.readString()).toBe('cn=root');
  expect(ber.readString()).toBe('foo');
});
