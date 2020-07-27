// Copyright 2011 Mark Cavage, Inc.  All rights reserved.
'use strict';

const asn1 = require('asn1');

////////////////////
// Globals

const BerReader = asn1.BerReader;
const BerWriter = asn1.BerWriter;
let BindRequest;
let dn;

////////////////////
// Tests

test('load library', () => {
  BindRequest = require('../../lib/index').BindRequest;
  dn = require('../../lib/index').dn;
  expect(BindRequest).toBeTruthy();
  expect(dn).toBeTruthy();
});

test('new no args', () => {
  expect(new BindRequest()).toBeTruthy();
});

test('new with args', () => {
  const req = new BindRequest({
    version: 3,
    name: dn.parse('cn=root'),
    credentials: 'secret',
  });
  expect(req).toBeTruthy();
  expect(req.version).toBe(3);
  expect(req.name.toString()).toBe('cn=root');
  expect(req.credentials).toBe('secret');
});

test('parse', () => {
  const ber = new BerWriter();
  ber.writeInt(3);
  ber.writeString('cn=root');
  ber.writeString('secret', 0x80);

  const req = new BindRequest();
  expect(req._parse(new BerReader(ber.buffer))).toBeTruthy();
  expect(req.version).toBe(3);
  expect(req.dn.toString()).toBe('cn=root');
  expect(req.credentials).toBe('secret');
});

test('toBer', () => {
  const req = new BindRequest({
    messageID: 123,
    version: 3,
    name: dn.parse('cn=root'),
    credentials: 'secret',
  });
  expect(req).toBeTruthy();

  const ber = new BerReader(req.toBer());
  expect(ber).toBeTruthy();
  expect(ber.readSequence()).toBe(0x30);
  expect(ber.readInt()).toBe(123);
  expect(ber.readSequence()).toBe(0x60);
  expect(ber.readInt()).toBe(0x03);
  expect(ber.readString()).toBe('cn=root');
  expect(ber.readString(0x80)).toBe('secret');
});
