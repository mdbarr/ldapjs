// Copyright 2011 Mark Cavage, Inc.  All rights reserved.
'use strict';

const asn1 = require('asn1');

////////////////////
// Globals

const BerReader = asn1.BerReader;
const BerWriter = asn1.BerWriter;
let SearchEntry;
let Attribute;
let dn;

////////////////////
// Tests

test('load library', () => {
  SearchEntry = require('../../lib/index').SearchEntry;
  Attribute = require('../../lib/index').Attribute;
  dn = require('../../lib/index').dn;
  expect(SearchEntry).toBeTruthy();
  expect(dn).toBeTruthy();
  expect(Attribute).toBeTruthy();
});

test('new no args', () => {
  expect(new SearchEntry()).toBeTruthy();
});

test('new with args', () => {
  const res = new SearchEntry({
    messageID: 123,
    objectName: dn.parse('cn=foo, o=test'),
    attributes: [
      new Attribute({
        type: 'cn',
        vals: [ 'foo' ],
      }),
      new Attribute({
        type: 'objectclass',
        vals: [ 'person' ],
      }),
    ],
  });
  expect(res).toBeTruthy();
  expect(res.messageID).toBe(123);
  expect(res.dn.toString()).toBe('cn=foo, o=test');
  expect(res.attributes.length).toBe(2);
  expect(res.attributes[0].type).toBe('cn');
  expect(res.attributes[0].vals[0]).toBe('foo');
  expect(res.attributes[1].type).toBe('objectclass');
  expect(res.attributes[1].vals[0]).toBe('person');
});

test('parse', () => {
  const ber = new BerWriter();
  ber.writeString('cn=foo, o=test');

  ber.startSequence();

  ber.startSequence();
  ber.writeString('cn');
  ber.startSequence(0x31);
  ber.writeString('foo');
  ber.endSequence();
  ber.endSequence();

  ber.startSequence();
  ber.writeString('objectclass');
  ber.startSequence(0x31);
  ber.writeString('person');
  ber.endSequence();
  ber.endSequence();

  ber.endSequence();

  const res = new SearchEntry();
  expect(res._parse(new BerReader(ber.buffer))).toBeTruthy();
  expect(res.dn).toBe('cn=foo, o=test');
  expect(res.attributes.length).toBe(2);
  expect(res.attributes[0].type).toBe('cn');
  expect(res.attributes[0].vals[0]).toBe('foo');
  expect(res.attributes[1].type).toBe('objectclass');
  expect(res.attributes[1].vals[0]).toBe('person');
});

test('toBer', () => {
  const res = new SearchEntry({
    messageID: 123,
    objectName: dn.parse('cn=foo, o=test'),
    attributes: [
      new Attribute({
        type: 'cn',
        vals: [ 'foo' ],
      }),
      new Attribute({
        type: 'objectclass',
        vals: [ 'person' ],
      }),
    ],
  });
  expect(res).toBeTruthy();

  const ber = new BerReader(res.toBer());
  expect(ber).toBeTruthy();
  expect(ber.readSequence()).toBe(0x30);
  expect(ber.readInt()).toBe(123);
  expect(ber.readSequence()).toBe(0x64);
  expect(ber.readString()).toBe('cn=foo, o=test');
  expect(ber.readSequence()).toBeTruthy();

  expect(ber.readSequence()).toBeTruthy();
  expect(ber.readString()).toBe('cn');
  expect(ber.readSequence()).toBe(0x31);
  expect(ber.readString()).toBe('foo');

  expect(ber.readSequence()).toBeTruthy();
  expect(ber.readString()).toBe('objectclass');
  expect(ber.readSequence()).toBe(0x31);
  expect(ber.readString()).toBe('person');
});
