// Copyright 2011 Mark Cavage, Inc.  All rights reserved.
'use strict';

const asn1 = require('asn1');

////////////////////
// Globals

const BerReader = asn1.BerReader;
const BerWriter = asn1.BerWriter;
let AddRequest;
let Attribute;
let dn;

////////////////////
// Tests

test('load library', () => {
  AddRequest = require('../../lib/index').AddRequest;
  Attribute = require('../../lib/index').Attribute;
  dn = require('../../lib/index').dn;
  expect(AddRequest).toBeTruthy();
  expect(Attribute).toBeTruthy();
  expect(dn).toBeTruthy();
});

test('new no args', () => {
  expect(new AddRequest()).toBeTruthy();
});

test('new with args', () => {
  const req = new AddRequest({
    entry: dn.parse('cn=foo, o=test'),
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
  expect(req).toBeTruthy();
  expect(req.dn.toString()).toBe('cn=foo, o=test');
  expect(req.attributes.length).toBe(2);
  expect(req.attributes[0].type).toBe('cn');
  expect(req.attributes[0].vals[0]).toBe('foo');
  expect(req.attributes[1].type).toBe('objectclass');
  expect(req.attributes[1].vals[0]).toBe('person');
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

  const req = new AddRequest();
  expect(req._parse(new BerReader(ber.buffer))).toBeTruthy();
  expect(req.dn.toString()).toBe('cn=foo, o=test');
  expect(req.attributes.length).toBe(2);
  expect(req.attributes[0].type).toBe('cn');
  expect(req.attributes[0].vals[0]).toBe('foo');
  expect(req.attributes[1].type).toBe('objectclass');
  expect(req.attributes[1].vals[0]).toBe('person');
});

test('toBer', () => {
  const req = new AddRequest({
    messageID: 123,
    entry: dn.parse('cn=foo, o=test'),
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

  expect(req).toBeTruthy();

  const ber = new BerReader(req.toBer());
  expect(ber).toBeTruthy();
  expect(ber.readSequence()).toBe(0x30);
  expect(ber.readInt()).toBe(123);
  expect(ber.readSequence()).toBe(0x68);
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

test('toObject', () => {
  const req = new AddRequest({
    entry: dn.parse('cn=foo, o=test'),
    attributes: [
      new Attribute({
        type: 'cn',
        vals: [ 'foo', 'bar' ],
      }),
      new Attribute({
        type: 'objectclass',
        vals: [ 'person' ],
      }),
    ],
  });

  expect(req).toBeTruthy();

  const obj = req.toObject();
  expect(obj).toBeTruthy();

  expect(obj.dn).toBeTruthy();
  expect(obj.dn).toBe('cn=foo, o=test');
  expect(obj.attributes).toBeTruthy();
  expect(obj.attributes.cn).toBeTruthy();
  expect(Array.isArray(obj.attributes.cn)).toBeTruthy();
  expect(obj.attributes.cn.length).toBe(2);
  expect(obj.attributes.cn[0]).toBe('foo');
  expect(obj.attributes.cn[1]).toBe('bar');
  expect(obj.attributes.objectclass).toBeTruthy();
  expect(Array.isArray(obj.attributes.objectclass)).toBeTruthy();
  expect(obj.attributes.objectclass.length).toBe(1);
  expect(obj.attributes.objectclass[0]).toBe('person');
});
