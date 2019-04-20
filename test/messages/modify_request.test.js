// Copyright 2011 Mark Cavage, Inc.  All rights reserved.
'use strict';

const asn1 = require('asn1');

////////////////////
// Globals

const BerReader = asn1.BerReader;
const BerWriter = asn1.BerWriter;
let ModifyRequest;
let Attribute;
let Change;
let dn;

////////////////////
// Tests

test('load library', () => {
  ModifyRequest = require('../../lib/index').ModifyRequest;
  Attribute = require('../../lib/index').Attribute;
  Change = require('../../lib/index').Change;
  dn = require('../../lib/index').dn;
  expect(ModifyRequest).toBeTruthy();
  expect(Attribute).toBeTruthy();
  expect(Change).toBeTruthy();
  expect(dn).toBeTruthy();
});

test('new no args', () => {
  expect(new ModifyRequest()).toBeTruthy();
});

test('new with args', () => {
  const req = new ModifyRequest({
    object: dn.parse('cn=foo, o=test'),
    changes: [ new Change({
      operation: 'Replace',
      modification: new Attribute({
        type: 'objectclass',
        vals: [ 'person' ]
      })
    }) ]
  });
  expect(req).toBeTruthy();
  expect(req.dn.toString()).toBe('cn=foo, o=test');
  expect(req.changes.length).toBe(1);
  expect(req.changes[0].operation).toBe('replace');
  expect(req.changes[0].modification.type).toBe('objectclass');
  expect(req.changes[0].modification.vals[0]).toBe('person');
});

test('parse', () => {
  const ber = new BerWriter();
  ber.writeString('cn=foo, o=test');
  ber.startSequence();

  ber.startSequence();
  ber.writeEnumeration(0x02);

  ber.startSequence();
  ber.writeString('objectclass');
  ber.startSequence(0x31);
  ber.writeString('person');
  ber.endSequence();
  ber.endSequence();

  ber.endSequence();

  ber.endSequence();

  const req = new ModifyRequest();
  expect(req._parse(new BerReader(ber.buffer))).toBeTruthy();
  expect(req.dn.toString()).toBe('cn=foo, o=test');
  expect(req.changes.length).toBe(1);
  expect(req.changes[0].operation).toBe('replace');
  expect(req.changes[0].modification.type).toBe('objectclass');
  expect(req.changes[0].modification.vals[0]).toBe('person');
});

test('toBer', () => {
  const req = new ModifyRequest({
    messageID: 123,
    object: dn.parse('cn=foo, o=test'),
    changes: [ new Change({
      operation: 'Replace',
      modification: new Attribute({
        type: 'objectclass',
        vals: [ 'person' ]
      })
    }) ]
  });

  expect(req).toBeTruthy();

  const ber = new BerReader(req.toBer());
  expect(ber).toBeTruthy();
  expect(ber.readSequence()).toBe(0x30);
  expect(ber.readInt()).toBe(123);
  expect(ber.readSequence()).toBe(0x66);
  expect(ber.readString()).toBe('cn=foo, o=test');
  expect(ber.readSequence()).toBeTruthy();
  expect(ber.readSequence()).toBeTruthy();
  expect(ber.readEnumeration()).toBe(0x02);

  expect(ber.readSequence()).toBeTruthy();
  expect(ber.readString()).toBe('objectclass');
  expect(ber.readSequence()).toBe(0x31);
  expect(ber.readString()).toBe('person');
});
