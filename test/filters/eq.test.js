// Copyright 2011 Mark Cavage, Inc.  All rights reserved.
'use strict';

const asn1 = require('asn1');

////////////////////
// Globals

let EqualityFilter;
const BerReader = asn1.BerReader;
const BerWriter = asn1.BerWriter;

////////////////////
// Tests

test('load library', () => {
  const filters = require('../../lib/index').filters;
  expect(filters).toBeTruthy();
  EqualityFilter = filters.EqualityFilter;
  expect(EqualityFilter).toBeTruthy();
});

test('Construct no args', () => {
  const f = new EqualityFilter();
  expect(f).toBeTruthy();
  expect(!f.attribute).toBeTruthy();
  expect(!f.value).toBeTruthy();
});

test('Construct args', () => {
  const f = new EqualityFilter({
    attribute: 'foo',
    value: 'bar',
  });
  expect(f).toBeTruthy();
  expect(f.attribute).toBe('foo');
  expect(f.value).toBe('bar');
  expect(f.toString()).toBe('(foo=bar)');
});

test('GH-109 = escape value only in toString()', () => {
  const f = new EqualityFilter({
    attribute: 'foo',
    value: 'ba(r)',
  });
  expect(f).toBeTruthy();
  expect(f.attribute).toBe('foo');
  expect(f.value).toBe('ba(r)');
  expect(f.toString()).toBe('(foo=ba\\28r\\29)');
});

test('match true', () => {
  const f = new EqualityFilter({
    attribute: 'foo',
    value: 'bar',
  });
  expect(f).toBeTruthy();
  expect(f.matches({ foo: 'bar' })).toBeTruthy();
});

test('match multiple', () => {
  const f = new EqualityFilter({
    attribute: 'foo',
    value: 'bar',
  });
  expect(f).toBeTruthy();
  expect(f.matches({ foo: [ 'plop', 'bar' ] })).toBeTruthy();
});

test('match false', () => {
  const f = new EqualityFilter({
    attribute: 'foo',
    value: 'bar',
  });
  expect(f).toBeTruthy();
  expect(!f.matches({ foo: 'baz' })).toBeTruthy();
});

test('parse ok', () => {
  const writer = new BerWriter();
  writer.writeString('foo');
  writer.writeString('bar');

  const f = new EqualityFilter();
  expect(f).toBeTruthy();
  expect(f.parse(new BerReader(writer.buffer))).toBeTruthy();
  expect(f.matches({ foo: 'bar' })).toBeTruthy();
  expect(f.attribute).toBe('foo');
  expect(f.value).toBe('bar');
});

test('escape EqualityFilter inputs', () => {
  const f = new EqualityFilter({
    attribute: '(|(foo',
    value: 'bar))(',
  });

  expect(f.attribute).toBe('(|(foo');
  expect(f.value).toBe('bar))(');
  expect(f.toString()).toBe('(\\28|\\28foo=bar\\29\\29\\28)');
});

test('parse bad', done => {
  const writer = new BerWriter();
  writer.writeString('foo');
  writer.writeInt(20);

  const f = new EqualityFilter();
  expect(f).toBeTruthy();
  try {
    f.parse(new BerReader(writer.buffer));
    done.fail('Should have thrown InvalidAsn1Error');
  } catch (e) {
    expect(e.name).toBe('InvalidAsn1Error');
    done();
  }
});

test('GH-109 = to ber uses plain values', () => {
  let f = new EqualityFilter({
    attribute: 'foo',
    value: 'ba(r)',
  });
  expect(f).toBeTruthy();
  const writer = new BerWriter();
  f.toBer(writer);

  f = new EqualityFilter();
  expect(f).toBeTruthy();

  const reader = new BerReader(writer.buffer);
  reader.readSequence();
  expect(f.parse(reader)).toBeTruthy();

  expect(f.attribute).toBe('foo');
  expect(f.value).toBe('ba(r)');
});

test('handle values passed via buffer', () => {
  const b = Buffer.from([ 32, 64, 128, 254 ]);
  const f = new EqualityFilter({
    attribute: 'foo',
    value: b,
  });
  expect(f).toBeTruthy();

  const writer = new BerWriter();
  f.toBer(writer);
  const reader = new BerReader(writer.buffer);
  reader.readSequence();

  const f2 = new EqualityFilter();
  expect(f2.parse(reader)).toBeTruthy();

  expect(f2.value).toBe(b.toString());
  expect(f2.raw.length).toBe(b.length);
  for (let i = 0; i < b.length; i++) {
    expect(f2.raw[i]).toBe(b[i]);
  }
});

test('GH-277 objectClass should be case-insensitive', () => {
  const f = new EqualityFilter({
    attribute: 'objectClass',
    value: 'CaseInsensitiveObj',
  });
  expect(f).toBeTruthy();
  expect(f.matches({ objectClass: 'CaseInsensitiveObj' })).toBeTruthy();
  expect(f.matches({ OBJECTCLASS: 'CASEINSENSITIVEOBJ' })).toBeTruthy();
  expect(f.matches({ objectclass: 'caseinsensitiveobj' })).toBeTruthy();
  expect(!f.matches({ objectclass: 'matchless' })).toBeTruthy();
});
