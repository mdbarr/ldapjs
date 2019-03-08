// Copyright 2011 Mark Cavage, Inc.  All rights reserved.
'use strict';

const test = require('tape').test;

const asn1 = require('asn1');

///--- Globals

let ApproximateFilter;
const BerReader = asn1.BerReader;
const BerWriter = asn1.BerWriter;

///--- Tests

test('load library', function (t) {
  const filters = require('../../lib/index').filters;
  t.ok(filters);
  ApproximateFilter = filters.ApproximateFilter;
  t.ok(ApproximateFilter);
  t.end();
});

test('Construct no args', function (t) {
  const f = new ApproximateFilter();
  t.ok(f);
  t.ok(!f.attribute);
  t.ok(!f.value);
  t.end();
});

test('Construct args', function (t) {
  const f = new ApproximateFilter({
    attribute: 'foo',
    value: 'bar'
  });
  t.ok(f);
  t.equal(f.attribute, 'foo');
  t.equal(f.value, 'bar');
  t.equal(f.toString(), '(foo~=bar)');
  t.end();
});

test('GH-109 = escape value only in toString()', function (t) {
  const f = new ApproximateFilter({
    attribute: 'foo',
    value: 'ba(r)'
  });
  t.ok(f);
  t.equal(f.attribute, 'foo');
  t.equal(f.value, 'ba(r)');
  t.equal(f.toString(), '(foo~=ba\\28r\\29)');
  t.end();
});

test('parse ok', function (t) {
  const writer = new BerWriter();
  writer.writeString('foo');
  writer.writeString('bar');

  const f = new ApproximateFilter();
  t.ok(f);
  t.ok(f.parse(new BerReader(writer.buffer)));
  t.end();
});

test('parse bad', function (t) {
  const writer = new BerWriter();
  writer.writeString('foo');
  writer.writeInt(20);

  const f = new ApproximateFilter();
  t.ok(f);
  try {
    f.parse(new BerReader(writer.buffer));
    t.fail('Should have thrown InvalidAsn1Error');
  } catch (e) {
    t.equal(e.name, 'InvalidAsn1Error');
  }
  t.end();
});

test('GH-109 = to ber uses plain values', function (t) {
  let f = new ApproximateFilter({
    attribute: 'foo',
    value: 'ba(r)'
  });
  t.ok(f);
  const writer = new BerWriter();
  f.toBer(writer);

  f = new ApproximateFilter();
  t.ok(f);

  const reader = new BerReader(writer.buffer);
  reader.readSequence();
  t.ok(f.parse(reader));

  t.equal(f.attribute, 'foo');
  t.equal(f.value, 'ba(r)');
  t.end();
});
