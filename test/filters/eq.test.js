// Copyright 2011 Mark Cavage, Inc.  All rights reserved.
'use strict';

const test = require('tape').test;

const asn1 = require('asn1');

////////////////////
// Globals

let EqualityFilter;
const BerReader = asn1.BerReader;
const BerWriter = asn1.BerWriter;

////////////////////
// Tests

test('load library', (t) => {
  const filters = require('../../lib/index').filters;
  t.ok(filters);
  EqualityFilter = filters.EqualityFilter;
  t.ok(EqualityFilter);
  t.end();
});

test('Construct no args', (t) => {
  const f = new EqualityFilter();
  t.ok(f);
  t.ok(!f.attribute);
  t.ok(!f.value);
  t.end();
});

test('Construct args', (t) => {
  const f = new EqualityFilter({
    attribute: 'foo',
    value: 'bar'
  });
  t.ok(f);
  t.equal(f.attribute, 'foo');
  t.equal(f.value, 'bar');
  t.equal(f.toString(), '(foo=bar)');
  t.end();
});

test('GH-109 = escape value only in toString()', (t) => {
  const f = new EqualityFilter({
    attribute: 'foo',
    value: 'ba(r)'
  });
  t.ok(f);
  t.equal(f.attribute, 'foo');
  t.equal(f.value, 'ba(r)');
  t.equal(f.toString(), '(foo=ba\\28r\\29)');
  t.end();
});

test('match true', (t) => {
  const f = new EqualityFilter({
    attribute: 'foo',
    value: 'bar'
  });
  t.ok(f);
  t.ok(f.matches({ foo: 'bar' }));
  t.end();
});

test('match multiple', (t) => {
  const f = new EqualityFilter({
    attribute: 'foo',
    value: 'bar'
  });
  t.ok(f);
  t.ok(f.matches({ foo: [ 'plop', 'bar' ] }));
  t.end();
});

test('match false', (t) => {
  const f = new EqualityFilter({
    attribute: 'foo',
    value: 'bar'
  });
  t.ok(f);
  t.ok(!f.matches({ foo: 'baz' }));
  t.end();
});

test('parse ok', (t) => {
  const writer = new BerWriter();
  writer.writeString('foo');
  writer.writeString('bar');

  const f = new EqualityFilter();
  t.ok(f);
  t.ok(f.parse(new BerReader(writer.buffer)));
  t.ok(f.matches({ foo: 'bar' }));
  t.equal(f.attribute, 'foo');
  t.equal(f.value, 'bar');
  t.end();
});

test('escape EqualityFilter inputs', (t) => {
  const f = new EqualityFilter({
    attribute: '(|(foo',
    value: 'bar))('
  });

  t.equal(f.attribute, '(|(foo');
  t.equal(f.value, 'bar))(');
  t.equal(f.toString(), '(\\28|\\28foo=bar\\29\\29\\28)');
  t.end();
});

test('parse bad', (t) => {
  const writer = new BerWriter();
  writer.writeString('foo');
  writer.writeInt(20);

  const f = new EqualityFilter();
  t.ok(f);
  try {
    f.parse(new BerReader(writer.buffer));
    t.fail('Should have thrown InvalidAsn1Error');
  } catch (e) {
    t.equal(e.name, 'InvalidAsn1Error');
  }
  t.end();
});

test('GH-109 = to ber uses plain values', (t) => {
  let f = new EqualityFilter({
    attribute: 'foo',
    value: 'ba(r)'
  });
  t.ok(f);
  const writer = new BerWriter();
  f.toBer(writer);

  f = new EqualityFilter();
  t.ok(f);

  const reader = new BerReader(writer.buffer);
  reader.readSequence();
  t.ok(f.parse(reader));

  t.equal(f.attribute, 'foo');
  t.equal(f.value, 'ba(r)');
  t.end();
});

test('handle values passed via buffer', (t) => {
  const b = new Buffer([ 32, 64, 128, 254 ]);
  const f = new EqualityFilter({
    attribute: 'foo',
    value: b
  });
  t.ok(f);

  const writer = new BerWriter();
  f.toBer(writer);
  const reader = new BerReader(writer.buffer);
  reader.readSequence();

  const f2 = new EqualityFilter();
  t.ok(f2.parse(reader));

  t.equal(f2.value, b.toString());
  t.equal(f2.raw.length, b.length);
  for (let i = 0; i < b.length; i++) {
    t.equal(f2.raw[i], b[i]);
  }
  t.end();
});

test('GH-277 objectClass should be case-insensitive', (t) => {
  const f = new EqualityFilter({
    attribute: 'objectClass',
    value: 'CaseInsensitiveObj'
  });
  t.ok(f);
  t.ok(f.matches({ objectClass: 'CaseInsensitiveObj' }));
  t.ok(f.matches({ OBJECTCLASS: 'CASEINSENSITIVEOBJ' }));
  t.ok(f.matches({ objectclass: 'caseinsensitiveobj' }));
  t.ok(!f.matches({ objectclass: 'matchless' }));
  t.end();
});
