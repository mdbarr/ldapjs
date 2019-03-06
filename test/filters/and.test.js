// Copyright 2011 Mark Cavage, Inc.  All rights reserved.

const test = require('tape').test;

const asn1 = require('asn1');

///--- Globals

let EqualityFilter;
let AndFilter;

///--- Tests

test('load library', function (t) {
  const filters = require('../../lib/index').filters;
  t.ok(filters);
  EqualityFilter = filters.EqualityFilter;
  AndFilter = filters.AndFilter;
  t.ok(EqualityFilter);
  t.ok(AndFilter);
  t.end();
});

test('Construct no args', function (t) {
  t.ok(new AndFilter());
  t.end();
});

test('Construct args', function (t) {
  const f = new AndFilter();
  f.addFilter(new EqualityFilter({
    attribute: 'foo',
    value: 'bar'
  }));
  f.addFilter(new EqualityFilter({
    attribute: 'zig',
    value: 'zag'
  }));
  t.ok(f);
  t.equal(f.toString(), '(&(foo=bar)(zig=zag))');
  t.end();
});

test('match true', function (t) {
  const f = new AndFilter();
  f.addFilter(new EqualityFilter({
    attribute: 'foo',
    value: 'bar'
  }));
  f.addFilter(new EqualityFilter({
    attribute: 'zig',
    value: 'zag'
  }));
  t.ok(f);
  t.ok(f.matches({
    foo: 'bar',
    zig: 'zag'
  }));
  t.end();
});

test('match false', function (t) {
  const f = new AndFilter();
  f.addFilter(new EqualityFilter({
    attribute: 'foo',
    value: 'bar'
  }));
  f.addFilter(new EqualityFilter({
    attribute: 'zig',
    value: 'zag'
  }));
  t.ok(f);
  t.ok(!f.matches({
    foo: 'bar',
    zig: 'zonk'
  }));
  t.end();
});
