// Copyright 2011 Mark Cavage, Inc.  All rights reserved.
'use strict';

const test = require('tape').test;

const asn1 = require('asn1');

////////////////////
// Globals

let PresenceFilter;
const BerReader = asn1.BerReader;
const BerWriter = asn1.BerWriter;

////////////////////
// Tests

test('load library', (t) => {
  const filters = require('../../lib/index').filters;
  t.ok(filters);
  PresenceFilter = filters.PresenceFilter;
  t.ok(PresenceFilter);
  t.end();
});

test('Construct no args', (t) => {
  const f = new PresenceFilter();
  t.ok(f);
  t.ok(!f.attribute);
  t.end();
});

test('Construct args', (t) => {
  const f = new PresenceFilter({ attribute: 'foo' });
  t.ok(f);
  t.equal(f.attribute, 'foo');
  t.equal(f.toString(), '(foo=*)');
  t.end();
});

test('GH-109 = escape value only in toString()', (t) => {
  const f = new PresenceFilter({ attribute: 'fo)o' });
  t.ok(f);
  t.equal(f.attribute, 'fo)o');
  t.equal(f.toString(), '(fo\\29o=*)');
  t.end();
});

test('match true', (t) => {
  const f = new PresenceFilter({ attribute: 'foo' });
  t.ok(f);
  t.ok(f.matches({ foo: 'bar' }));
  t.end();
});

test('match false', (t) => {
  const f = new PresenceFilter({ attribute: 'foo' });
  t.ok(f);
  t.ok(!f.matches({ bar: 'foo' }));
  t.end();
});

test('parse ok', (t) => {
  const writer = new BerWriter();
  writer.writeString('foo', 0x87);

  const f = new PresenceFilter();
  t.ok(f);

  const reader = new BerReader(writer.buffer);
  reader.readSequence();
  t.ok(f.parse(reader));
  t.ok(f.matches({ foo: 'bar' }));
  t.end();
});

test('GH-109 = to ber uses plain values', (t) => {
  let f = new PresenceFilter({ attribute: 'f(o)o' });
  t.ok(f);
  const writer = new BerWriter();
  f.toBer(writer);

  f = new PresenceFilter();
  t.ok(f);

  const reader = new BerReader(writer.buffer);
  reader.readSequence();
  t.ok(f.parse(reader));

  t.equal(f.attribute, 'f(o)o');
  t.end();
});
