// Copyright 2011 Mark Cavage, Inc.  All rights reserved.
'use strict';

const asn1 = require('asn1');

////////////////////
// Globals

const BerReader = asn1.BerReader;
const BerWriter = asn1.BerWriter;
let Attribute;

////////////////////
// Tests

test('load library', () => {
  Attribute = require('../lib/index').Attribute;
  expect(Attribute).toBeTruthy();
});

test('new no args', () => {
  expect(new Attribute()).toBeTruthy();
});

test('new with args', () => {
  let attr = new Attribute({
    type: 'cn',
    vals: [ 'foo', 'bar' ]
  });
  expect(attr).toBeTruthy();
  attr.addValue('baz');
  expect(attr.type).toBe('cn');
  expect(attr.vals.length).toBe(3);
  expect(attr.vals[0]).toBe('foo');
  expect(attr.vals[1]).toBe('bar');
  expect(attr.vals[2]).toBe('baz');
  expect(() => {
    attr = new Attribute('not an object');
  }).toThrow();
  expect(() => {
    const typeThatIsNotAString = 1;
    attr = new Attribute({ type: typeThatIsNotAString });
  }).toThrow();
});

test('toBer', () => {
  const attr = new Attribute({
    type: 'cn',
    vals: [ 'foo', 'bar' ]
  });
  expect(attr).toBeTruthy();
  const ber = new BerWriter();
  attr.toBer(ber);
  const reader = new BerReader(ber.buffer);
  expect(reader.readSequence()).toBeTruthy();
  expect(reader.readString()).toBe('cn');
  expect(reader.readSequence()).toBe(0x31); // lber set
  expect(reader.readString()).toBe('foo');
  expect(reader.readString()).toBe('bar');
});

test('parse', () => {
  const ber = new BerWriter();
  ber.startSequence();
  ber.writeString('cn');
  ber.startSequence(0x31);
  ber.writeStringArray([ 'foo', 'bar' ]);
  ber.endSequence();
  ber.endSequence();

  const attr = new Attribute();
  expect(attr).toBeTruthy();
  expect(attr.parse(new BerReader(ber.buffer))).toBeTruthy();

  expect(attr.type).toBe('cn');
  expect(attr.vals.length).toBe(2);
  expect(attr.vals[0]).toBe('foo');
  expect(attr.vals[1]).toBe('bar');
});

test('parse - without 0x31', () => {
  const ber = new BerWriter;
  ber.startSequence();
  ber.writeString('sn');
  ber.endSequence();

  const attr = new Attribute;
  expect(attr).toBeTruthy();
  expect(attr.parse(new BerReader(ber.buffer))).toBeTruthy();

  expect(attr.type).toBe('sn');
  expect(attr.vals.length).toBe(0);
});

test('toString', () => {
  const attr = new Attribute({
    type: 'foobar',
    vals: [ 'asdf' ]
  });
  const expected = attr.toString();
  const actual = JSON.stringify(attr.json);
  expect(actual).toBe(expected);
});

test('isAttribute', () => {
  const isA = Attribute.isAttribute;
  expect(isA(null)).toBeFalsy();
  expect(isA('asdf')).toBeFalsy();
  expect(isA(new Attribute({
    type: 'foobar',
    vals: [ 'asdf' ]
  }))).toBeTruthy();

  expect(isA({
    type: 'foo',
    vals: [ 'item', new Buffer(5) ],
    toBer () { /* placeholder */ }
  })).toBeTruthy();

  // bad type in vals
  expect(isA({
    type: 'foo',
    vals: [ 'item', null ],
    toBer () { /* placeholder */ }
  })).toBeFalsy();
});

test('compare', () => {
  const comp = Attribute.compare;
  const a = new Attribute({
    type: 'foo',
    vals: [ 'bar' ]
  });
  const b = new Attribute({
    type: 'foo',
    vals: [ 'bar' ]
  });
  const notAnAttribute = 'this is not an attribute';

  expect(() => {
    comp(a, notAnAttribute);
  }).toThrow();
  expect(() => {
    comp(notAnAttribute, b);
  }).toThrow();

  expect(comp(a, b)).toBe(0);

  // Different types
  a.type = 'boo';
  expect(comp(a, b)).toBe(-1);
  expect(comp(b, a)).toBe(1);
  a.type = 'foo';

  // Different value counts
  a.vals = [ 'bar', 'baz' ];
  expect(comp(a, b)).toBe(1);
  expect(comp(b, a)).toBe(-1);

  // Different value contents (same count)
  a.vals = [ 'baz' ];
  expect(comp(a, b)).toBe(1);
  expect(comp(b, a)).toBe(-1);
});
