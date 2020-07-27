// Copyright 2011 Mark Cavage, Inc.  All rights reserved.
'use strict';

const asn1 = require('asn1');

////////////////////
// Globals

const BerReader = asn1.BerReader;
const BerWriter = asn1.BerWriter;
let ExtendedRequest;
let dn;

////////////////////
// Tests

test('load library', () => {
  ExtendedRequest = require('../../lib/index').ExtendedRequest;
  dn = require('../../lib/index').dn;
  expect(ExtendedRequest).toBeTruthy();
  expect(dn).toBeTruthy();
});

test('new no args', () => {
  expect(new ExtendedRequest()).toBeTruthy();
});

test('new with args', () => {
  const req = new ExtendedRequest({
    requestName: '1.2.3.4',
    requestValue: 'test',
  });
  expect(req).toBeTruthy();
  expect(req.requestName).toBe('1.2.3.4');
  expect(req.requestValue).toBe('test');
});

test('parse', () => {
  const ber = new BerWriter();
  ber.writeString('1.2.3.4', 0x80);
  ber.writeString('test', 0x81);

  const req = new ExtendedRequest();
  expect(req._parse(new BerReader(ber.buffer))).toBeTruthy();
  expect(req.requestName).toBe('1.2.3.4');
  expect(req.requestValue).toBe('test');
});

test('toBer', () => {
  const req = new ExtendedRequest({
    messageID: 123,
    requestName: '1.2.3.4',
    requestValue: 'test',
  });

  expect(req).toBeTruthy();

  const ber = new BerReader(req.toBer());
  expect(ber).toBeTruthy();
  expect(ber.readSequence()).toBe(0x30);
  expect(ber.readInt()).toBe(123);
  expect(ber.readSequence()).toBe(0x77);
  expect(ber.readString(0x80)).toBe('1.2.3.4');
  expect(ber.readString(0x81)).toBe('test');
});
