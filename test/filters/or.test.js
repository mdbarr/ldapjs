// Copyright 2011 Mark Cavage, Inc.  All rights reserved.
'use strict';

const test = require('tape').test;

////////////////////
// Globals

let EqualityFilter;
let OrFilter;

////////////////////
// Tests

test('load library', (t) => {
  const filters = require('../../lib/index').filters;
  t.ok(filters);
  EqualityFilter = filters.EqualityFilter;
  OrFilter = filters.OrFilter;
  t.ok(EqualityFilter);
  t.ok(OrFilter);
  t.end();
});

test('Construct no args', (t) => {
  t.ok(new OrFilter());
  t.end();
});

test('Construct args', (t) => {
  const f = new OrFilter();
  f.addFilter(new EqualityFilter({
    attribute: 'foo',
    value: 'bar'
  }));
  f.addFilter(new EqualityFilter({
    attribute: 'zig',
    value: 'zag'
  }));
  t.ok(f);
  t.equal(f.toString(), '(|(foo=bar)(zig=zag))');
  t.end();
});

test('match true', (t) => {
  const f = new OrFilter();
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
    zig: 'zonk'
  }));
  t.end();
});

test('match false', (t) => {
  const f = new OrFilter();
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
    foo: 'baz',
    zig: 'zonk'
  }));
  t.end();
});
