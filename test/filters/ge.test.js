// Copyright 2011 Mark Cavage, Inc.  All rights reserved.
'use strict';

const asn1 = require('asn1');

////////////////////
// Globals

let GreaterThanEqualsFilter;
const BerReader = asn1.BerReader;
const BerWriter = asn1.BerWriter;

////////////////////
// Tests

test('load library', () => {
  const filters = require('../../lib/index').filters;
  expect(filters).toBeTruthy();
  GreaterThanEqualsFilter = filters.GreaterThanEqualsFilter;
  expect(GreaterThanEqualsFilter).toBeTruthy();
});

test('Construct no args', () => {
  const f = new GreaterThanEqualsFilter();
  expect(f).toBeTruthy();
  expect(!f.attribute).toBeTruthy();
  expect(!f.value).toBeTruthy();
});

test('Construct args', () => {
  const f = new GreaterThanEqualsFilter({
    attribute: 'foo',
    value: 'bar',
  });
  expect(f).toBeTruthy();
  expect(f.attribute).toBe('foo');
  expect(f.value).toBe('bar');
  expect(f.toString()).toBe('(foo>=bar)');
});

test('GH-109 = escape value only in toString()', () => {
  const f = new GreaterThanEqualsFilter({
    attribute: 'foo',
    value: 'ba(r)',
  });
  expect(f).toBeTruthy();
  expect(f.attribute).toBe('foo');
  expect(f.value).toBe('ba(r)');
  expect(f.toString()).toBe('(foo>=ba\\28r\\29)');
});

test('match true', () => {
  const f = new GreaterThanEqualsFilter({
    attribute: 'foo',
    value: 'bar',
  });
  expect(f).toBeTruthy();
  expect(f.matches({ foo: 'baz' })).toBeTruthy();
});

test('match multiple', () => {
  const f = new GreaterThanEqualsFilter({
    attribute: 'foo',
    value: 'bar',
  });
  expect(f).toBeTruthy();
  expect(f.matches({ foo: [ 'beuha', 'baz' ] })).toBeTruthy();
});

test('match false', () => {
  const f = new GreaterThanEqualsFilter({
    attribute: 'foo',
    value: 'bar',
  });
  expect(f).toBeTruthy();
  expect(!f.matches({ foo: 'abc' })).toBeTruthy();
});

test('parse ok', () => {
  const writer = new BerWriter();
  writer.writeString('foo');
  writer.writeString('bar');

  const f = new GreaterThanEqualsFilter();
  expect(f).toBeTruthy();
  expect(f.parse(new BerReader(writer.buffer))).toBeTruthy();
  expect(f.matches({ foo: 'bar' })).toBeTruthy();
});

test('parse bad', done => {
  const writer = new BerWriter();
  writer.writeString('foo');
  writer.writeInt(20);

  const f = new GreaterThanEqualsFilter();
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
  let f = new GreaterThanEqualsFilter({
    attribute: 'foo',
    value: 'ba(r)',
  });
  expect(f).toBeTruthy();
  const writer = new BerWriter();
  f.toBer(writer);

  f = new GreaterThanEqualsFilter();
  expect(f).toBeTruthy();

  const reader = new BerReader(writer.buffer);
  reader.readSequence();
  expect(f.parse(reader)).toBeTruthy();

  expect(f.attribute).toBe('foo');
  expect(f.value).toBe('ba(r)');
});
