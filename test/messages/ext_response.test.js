// Copyright 2011 Mark Cavage, Inc.  All rights reserved.
'use strict';

const asn1 = require('asn1');

////////////////////
// Globals

const BerReader = asn1.BerReader;
const BerWriter = asn1.BerWriter;
let ExtendedResponse;

////////////////////
// Tests

test('load library', () => {
  ExtendedResponse = require('../../lib/index').ExtendedResponse;
  expect(ExtendedResponse).toBeTruthy();
});

test('new no args', () => {
  expect(new ExtendedResponse()).toBeTruthy();
});

test('new with args', () => {
  const res = new ExtendedResponse({
    messageID: 123,
    status: 0,
    responseName: '1.2.3.4',
    responseValue: 'test'
  });
  expect(res).toBeTruthy();
  expect(res.messageID).toBe(123);
  expect(res.status).toBe(0);
  expect(res.responseName).toBe('1.2.3.4');
  expect(res.responseValue).toBe('test');
});

test('parse', () => {
  const ber = new BerWriter();
  ber.writeEnumeration(0);
  ber.writeString('cn=root');
  ber.writeString('foo');
  ber.writeString('1.2.3.4', 0x8a);
  ber.writeString('test', 0x8b);

  const res = new ExtendedResponse();
  expect(res._parse(new BerReader(ber.buffer))).toBeTruthy();
  expect(res.status).toBe(0);
  expect(res.matchedDN).toBe('cn=root');
  expect(res.errorMessage).toBe('foo');
  expect(res.responseName).toBe('1.2.3.4');
  expect(res.responseValue).toBe('test');
});

test('toBer', () => {
  const res = new ExtendedResponse({
    messageID: 123,
    status: 3,
    matchedDN: 'cn=root',
    errorMessage: 'foo',
    responseName: '1.2.3.4',
    responseValue: 'test'
  });
  expect(res).toBeTruthy();

  const ber = new BerReader(res.toBer());
  expect(ber).toBeTruthy();
  expect(ber.readSequence()).toBe(0x30);
  expect(ber.readInt()).toBe(123);
  expect(ber.readSequence()).toBe(0x78);
  expect(ber.readEnumeration()).toBe(3);
  expect(ber.readString()).toBe('cn=root');
  expect(ber.readString()).toBe('foo');
  expect(ber.readString(0x8a)).toBe('1.2.3.4');
  expect(ber.readString(0x8b)).toBe('test');
});
