// Copyright 2011 Mark Cavage, Inc.  All rights reserved.
'use strict';

////////////////////
// Globals

let EqualityFilter;
let OrFilter;

////////////////////
// Tests

test('load library', () => {
  const filters = require('../../lib/index').filters;
  expect(filters).toBeTruthy();
  EqualityFilter = filters.EqualityFilter;
  OrFilter = filters.OrFilter;
  expect(EqualityFilter).toBeTruthy();
  expect(OrFilter).toBeTruthy();
});

test('Construct no args', () => {
  expect(new OrFilter()).toBeTruthy();
});

test('Construct args', () => {
  const f = new OrFilter();
  f.addFilter(new EqualityFilter({
    attribute: 'foo',
    value: 'bar'
  }));
  f.addFilter(new EqualityFilter({
    attribute: 'zig',
    value: 'zag'
  }));
  expect(f).toBeTruthy();
  expect(f.toString()).toBe('(|(foo=bar)(zig=zag))');
});

test('match true', () => {
  const f = new OrFilter();
  f.addFilter(new EqualityFilter({
    attribute: 'foo',
    value: 'bar'
  }));
  f.addFilter(new EqualityFilter({
    attribute: 'zig',
    value: 'zag'
  }));
  expect(f).toBeTruthy();
  expect(f.matches({
    foo: 'bar',
    zig: 'zonk'
  })).toBeTruthy();
});

test('match false', () => {
  const f = new OrFilter();
  f.addFilter(new EqualityFilter({
    attribute: 'foo',
    value: 'bar'
  }));
  f.addFilter(new EqualityFilter({
    attribute: 'zig',
    value: 'zag'
  }));
  expect(f).toBeTruthy();
  expect(!f.matches({
    foo: 'baz',
    zig: 'zonk'
  })).toBeTruthy();
});
