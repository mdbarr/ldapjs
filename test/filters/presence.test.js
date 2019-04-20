// Copyright 2011 Mark Cavage, Inc.  All rights reserved.
'use strict';

const asn1 = require('asn1');

////////////////////
// Globals

let PresenceFilter;
const BerReader = asn1.BerReader;
const BerWriter = asn1.BerWriter;

////////////////////
// Tests

test('load library', () => {
  const filters = require('../../lib/index').filters;
  expect(filters).toBeTruthy();
  PresenceFilter = filters.PresenceFilter;
  expect(PresenceFilter).toBeTruthy();
});

test('Construct no args', () => {
  const f = new PresenceFilter();
  expect(f).toBeTruthy();
  expect(!f.attribute).toBeTruthy();
});

test('Construct args', () => {
  const f = new PresenceFilter({ attribute: 'foo' });
  expect(f).toBeTruthy();
  expect(f.attribute).toBe('foo');
  expect(f.toString()).toBe('(foo=*)');
});

test('GH-109 = escape value only in toString()', () => {
  const f = new PresenceFilter({ attribute: 'fo)o' });
  expect(f).toBeTruthy();
  expect(f.attribute).toBe('fo)o');
  expect(f.toString()).toBe('(fo\\29o=*)');
});

test('match true', () => {
  const f = new PresenceFilter({ attribute: 'foo' });
  expect(f).toBeTruthy();
  expect(f.matches({ foo: 'bar' })).toBeTruthy();
});

test('match false', () => {
  const f = new PresenceFilter({ attribute: 'foo' });
  expect(f).toBeTruthy();
  expect(!f.matches({ bar: 'foo' })).toBeTruthy();
});

test('parse ok', () => {
  const writer = new BerWriter();
  writer.writeString('foo', 0x87);

  const f = new PresenceFilter();
  expect(f).toBeTruthy();

  const reader = new BerReader(writer.buffer);
  reader.readSequence();
  expect(f.parse(reader)).toBeTruthy();
  expect(f.matches({ foo: 'bar' })).toBeTruthy();
});

test('GH-109 = to ber uses plain values', () => {
  let f = new PresenceFilter({ attribute: 'f(o)o' });
  expect(f).toBeTruthy();
  const writer = new BerWriter();
  f.toBer(writer);

  f = new PresenceFilter();
  expect(f).toBeTruthy();

  const reader = new BerReader(writer.buffer);
  reader.readSequence();
  expect(f.parse(reader)).toBeTruthy();

  expect(f.attribute).toBe('f(o)o');
});
