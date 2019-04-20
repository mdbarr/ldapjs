// Copyright 2011 Mark Cavage, Inc.  All rights reserved.
'use strict';

const asn1 = require('asn1');

////////////////////
// Globals

const BerReader = asn1.BerReader;
const BerWriter = asn1.BerWriter;
let UnbindRequest;

////////////////////
// Tests

test('load library', () => {
  UnbindRequest = require('../../lib/index').UnbindRequest;
  expect(UnbindRequest).toBeTruthy();
});

test('new no args', () => {
  expect(new UnbindRequest()).toBeTruthy();
});

test('new with args', () => {
  const req = new UnbindRequest({});
  expect(req).toBeTruthy();
});

test('parse', () => {
  const ber = new BerWriter();

  const req = new UnbindRequest();
  expect(req._parse(new BerReader(ber.buffer))).toBeTruthy();
});

test('toBer', () => {
  const req = new UnbindRequest({ messageID: 123 });
  expect(req).toBeTruthy();

  const ber = new BerReader(req.toBer());
  expect(ber).toBeTruthy();
  expect(ber.readSequence()).toBe(0x30);
  expect(ber.readInt()).toBe(123);
});
