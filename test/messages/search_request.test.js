// Copyright 2011 Mark Cavage, Inc.  All rights reserved.
'use strict';

const asn1 = require('asn1');

////////////////////
// Globals

const BerReader = asn1.BerReader;
const BerWriter = asn1.BerWriter;
let SearchRequest;
let EqualityFilter;
let dn;

////////////////////
// Tests

test('load library', () => {
  SearchRequest = require('../../lib/index').SearchRequest;
  EqualityFilter = require('../../lib/index').EqualityFilter;
  dn = require('../../lib/index').dn;
  expect(SearchRequest).toBeTruthy();
  expect(EqualityFilter).toBeTruthy();
  expect(dn).toBeTruthy();
});

test('new no args', () => {
  expect(new SearchRequest()).toBeTruthy();
});

test('new with args', () => {
  const req = new SearchRequest({
    baseObject: dn.parse('cn=foo, o=test'),
    filter: new EqualityFilter({
      attribute: 'email',
      value: 'foo@bar.com',
    }),
    attributes: [ 'cn', 'sn' ],
  });
  expect(req).toBeTruthy();
  expect(req.dn.toString()).toBe('cn=foo, o=test');
  expect(req.filter.toString()).toBe('(email=foo@bar.com)');
  expect(req.attributes.length).toBe(2);
  expect(req.attributes[0]).toBe('cn');
  expect(req.attributes[1]).toBe('sn');
});

test('parse', () => {
  const f = new EqualityFilter({
    attribute: 'email',
    value: 'foo@bar.com',
  });

  let ber = new BerWriter();
  ber.writeString('cn=foo, o=test');
  ber.writeEnumeration(0);
  ber.writeEnumeration(0);
  ber.writeInt(1);
  ber.writeInt(2);
  ber.writeBoolean(false);
  ber = f.toBer(ber);

  const req = new SearchRequest();
  expect(req._parse(new BerReader(ber.buffer))).toBeTruthy();
  expect(req.dn.toString()).toBe('cn=foo, o=test');
  expect(req.scope).toBe('base');
  expect(req.derefAliases).toBe(0);
  expect(req.sizeLimit).toBe(1);
  expect(req.timeLimit).toBe(2);
  expect(req.typesOnly).toBe(false);
  expect(req.filter.toString()).toBe('(email=foo@bar.com)');
  expect(req.attributes.length).toBe(0);
});

test('toBer', () => {
  const req = new SearchRequest({
    messageID: 123,
    baseObject: dn.parse('cn=foo, o=test'),
    scope: 1,
    derefAliases: 2,
    sizeLimit: 10,
    timeLimit: 20,
    typesOnly: true,
    filter: new EqualityFilter({
      attribute: 'email',
      value: 'foo@bar.com',
    }),
    attributes: [ 'cn', 'sn' ],
  });

  expect(req).toBeTruthy();

  const ber = new BerReader(req.toBer());
  expect(ber).toBeTruthy();
  expect(ber.readSequence()).toBe(0x30);
  expect(ber.readInt()).toBe(123);
  expect(ber.readSequence()).toBe(0x63);
  expect(ber.readString()).toBe('cn=foo, o=test');
  expect(ber.readEnumeration()).toBe(1);
  expect(ber.readEnumeration()).toBe(2);
  expect(ber.readInt()).toBe(10);
  expect(ber.readInt()).toBe(20);
  expect(ber.readBoolean()).toBeTruthy();
  expect(ber.readSequence()).toBe(0xa3);
  expect(ber.readString()).toBe('email');
  expect(ber.readString()).toBe('foo@bar.com');
  expect(ber.readSequence()).toBeTruthy();
  expect(ber.readString()).toBe('cn');
  expect(ber.readString()).toBe('sn');
});
