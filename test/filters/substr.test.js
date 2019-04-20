// Copyright 2011 Mark Cavage, Inc.  All rights reserved.
'use strict';

const asn1 = require('asn1');

////////////////////
// Globals

let SubstringFilter;
const BerReader = asn1.BerReader;
const BerWriter = asn1.BerWriter;

////////////////////
// Tests

test('load library', () => {
  const filters = require('../../lib/index').filters;
  expect(filters).toBeTruthy();
  SubstringFilter = filters.SubstringFilter;
  expect(SubstringFilter).toBeTruthy();
});

test('Construct no args', () => {
  const f = new SubstringFilter();
  expect(f).toBeTruthy();
  expect(!f.attribute).toBeTruthy();
  expect(!f.value).toBeTruthy();
});

test('Construct args', () => {
  const f = new SubstringFilter({
    attribute: 'foo',
    initial: 'bar',
    any: [ 'zig', 'zag' ],
    'final': 'baz'
  });
  expect(f).toBeTruthy();
  expect(f.attribute).toBe('foo');
  expect(f.initial).toBe('bar');
  expect(f.any.length).toBe(2);
  expect(f.any[0]).toBe('zig');
  expect(f.any[1]).toBe('zag');
  expect(f.final).toBe('baz');
  expect(f.toString()).toBe('(foo=bar*zig*zag*baz)');
});

test('GH-109 = escape value only in toString()', () => {
  const f = new SubstringFilter({
    attribute: 'fo(o',
    initial: 'ba(r)',
    any: [ 'zi)g', 'z(ag' ],
    'final': '(baz)'
  });
  expect(f).toBeTruthy();
  expect(f.attribute).toBe('fo(o');
  expect(f.initial).toBe('ba(r)');
  expect(f.any.length).toBe(2);
  expect(f.any[0]).toBe('zi)g');
  expect(f.any[1]).toBe('z(ag');
  expect(f.final).toBe('(baz)');
  expect(f.toString()).toBe('(fo\\28o=ba\\28r\\29*zi\\29g*z\\28ag*\\28baz\\29)');
});

test('match true', () => {
  const f = new SubstringFilter({
    attribute: 'foo',
    initial: 'bar',
    any: [ 'zig', 'zag' ],
    'final': 'baz'
  });
  expect(f).toBeTruthy();
  expect(f.matches({ foo: 'barmoozigbarzagblahbaz' })).toBeTruthy();
});

test('match false', () => {
  const f = new SubstringFilter({
    attribute: 'foo',
    initial: 'bar',
    foo: [ 'zig', 'zag' ],
    'final': 'baz'
  });
  expect(f).toBeTruthy();
  expect(!f.matches({ foo: 'bafmoozigbarzagblahbaz' })).toBeTruthy();
});

test('match any', () => {
  const f = new SubstringFilter({
    attribute: 'foo',
    initial: 'bar'
  });
  expect(f).toBeTruthy();
  expect(f.matches({ foo: [ 'beuha', 'barista' ] })).toBeTruthy();
});

test('GH-109 = escape for regex in matches', () => {
  const f = new SubstringFilter({
    attribute: 'fo(o',
    initial: 'ba(r)',
    any: [ 'zi)g', 'z(ag' ],
    'final': '(baz)'
  });
  expect(f).toBeTruthy();
  expect(f.matches({ 'fo(o': [ 'ba(r)_zi)g-z(ag~(baz)' ] })).toBeTruthy();
});

test('parse ok', () => {
  const writer = new BerWriter();
  writer.writeString('foo');
  writer.startSequence();
  writer.writeString('bar', 0x80);
  writer.writeString('bad', 0x81);
  writer.writeString('baz', 0x82);
  writer.endSequence();
  const f = new SubstringFilter();
  expect(f).toBeTruthy();
  expect(f.parse(new BerReader(writer.buffer))).toBeTruthy();
  expect(f.matches({ foo: 'bargoobadgoobaz' })).toBeTruthy();
});

test('parse bad', done => {
  const writer = new BerWriter();
  writer.writeString('foo');
  writer.writeInt(20);

  const f = new SubstringFilter();
  expect(f).toBeTruthy();
  try {
    f.parse(new BerReader(writer.buffer));
    done.fail('Should have thrown InvalidAsn1Error');
  } catch (e) {
  }
});

test('GH-109 = to ber uses plain values', () => {
  let f = new SubstringFilter({
    attribute: 'fo(o',
    initial: 'ba(r)',
    any: [ 'zi)g', 'z(ag' ],
    'final': '(baz)'
  });
  expect(f).toBeTruthy();
  const writer = new BerWriter();
  f.toBer(writer);

  f = new SubstringFilter();
  expect(f).toBeTruthy();

  const reader = new BerReader(writer.buffer);
  reader.readSequence();
  expect(f.parse(reader)).toBeTruthy();

  expect(f.attribute).toBe('fo(o');
  expect(f.initial).toBe('ba(r)');
  expect(f.any.length).toBe(2);
  expect(f.any[0]).toBe('zi)g');
  expect(f.any[1]).toBe('z(ag');
  expect(f.final).toBe('(baz)');
});
