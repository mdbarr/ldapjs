// Copyright 2011 Mark Cavage, Inc.  All rights reserved.
'use strict';

const asn1 = require('asn1');

////////////////////
// Globals

const BerReader = asn1.BerReader;
const BerWriter = asn1.BerWriter;
let ModifyDNRequest;
let dn;

////////////////////
// Tests

test('load library', () => {
  ModifyDNRequest = require('../../lib/index').ModifyDNRequest;
  dn = require('../../lib/index').dn;
  expect(ModifyDNRequest).toBeTruthy();
  expect(dn).toBeTruthy();
});

test('new no args', () => {
  expect(new ModifyDNRequest()).toBeTruthy();
});

test('new with args', () => {
  const req = new ModifyDNRequest({
    entry: dn.parse('cn=foo, o=test'),
    newRdn: dn.parse('cn=foo2'),
    deleteOldRdn: true,
  });
  expect(req).toBeTruthy();
  expect(req.dn.toString()).toBe('cn=foo, o=test');
  expect(req.newRdn.toString()).toBe('cn=foo2');
  expect(req.deleteOldRdn).toBe(true);
});

test('parse', () => {
  const ber = new BerWriter();
  ber.writeString('cn=foo, o=test');
  ber.writeString('cn=foo2');
  ber.writeBoolean(true);

  const req = new ModifyDNRequest();
  expect(req._parse(new BerReader(ber.buffer))).toBeTruthy();
  expect(req.dn.toString()).toBe('cn=foo, o=test');
  expect(req.newRdn.toString()).toBe('cn=foo2');
  expect(req.deleteOldRdn).toBe(true);
});

test('toBer', () => {
  const req = new ModifyDNRequest({
    messageID: 123,
    entry: dn.parse('cn=foo, o=test'),
    newRdn: dn.parse('cn=foo2'),
    deleteOldRdn: true,
  });

  expect(req).toBeTruthy();

  const ber = new BerReader(req.toBer());
  expect(ber).toBeTruthy();
  expect(ber.readSequence()).toBe(0x30);
  expect(ber.readInt()).toBe(123);
  expect(ber.readSequence()).toBe(0x6c);
  expect(ber.readString()).toBe('cn=foo, o=test');
  expect(ber.readString()).toBe('cn=foo2');
  expect(ber.readBoolean()).toBe(true);
});
