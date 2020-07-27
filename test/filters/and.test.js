// Copyright 2011 Mark Cavage, Inc.  All rights reserved.
'use strict';

////////////////////
// Globals

let EqualityFilter;
let AndFilter;

////////////////////
// Tests

test('load library', () => {
  const filters = require('../../lib/index').filters;
  expect(filters).toBeTruthy();
  EqualityFilter = filters.EqualityFilter;
  AndFilter = filters.AndFilter;
  expect(EqualityFilter).toBeTruthy();
  expect(AndFilter).toBeTruthy();
});

test('Construct no args', () => {
  expect(new AndFilter()).toBeTruthy();
});

test('Construct args', () => {
  const f = new AndFilter();
  f.addFilter(new EqualityFilter({
    attribute: 'foo',
    value: 'bar',
  }));
  f.addFilter(new EqualityFilter({
    attribute: 'zig',
    value: 'zag',
  }));
  expect(f).toBeTruthy();
  expect(f.toString()).toBe('(&(foo=bar)(zig=zag))');
});

test('match true', () => {
  const f = new AndFilter();
  f.addFilter(new EqualityFilter({
    attribute: 'foo',
    value: 'bar',
  }));
  f.addFilter(new EqualityFilter({
    attribute: 'zig',
    value: 'zag',
  }));
  expect(f).toBeTruthy();
  expect(f.matches({
    foo: 'bar',
    zig: 'zag',
  })).toBeTruthy();
});

test('match false', () => {
  const f = new AndFilter();
  f.addFilter(new EqualityFilter({
    attribute: 'foo',
    value: 'bar',
  }));
  f.addFilter(new EqualityFilter({
    attribute: 'zig',
    value: 'zag',
  }));
  expect(f).toBeTruthy();
  expect(!f.matches({
    foo: 'bar',
    zig: 'zonk',
  })).toBeTruthy();
});
