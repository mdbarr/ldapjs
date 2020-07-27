// Copyright 2011 Mark Cavage, Inc.  All rights reserved.
'use strict';

////////////////////
// Globals

let EqualityFilter;
let NotFilter;

////////////////////
// Tests

test('load library', () => {
  const filters = require('../../lib/index').filters;
  expect(filters).toBeTruthy();
  EqualityFilter = filters.EqualityFilter;
  NotFilter = filters.NotFilter;
  expect(EqualityFilter).toBeTruthy();
  expect(NotFilter).toBeTruthy();
});

test('Construct no args', () => {
  expect(new NotFilter()).toBeTruthy();
});

test('Construct args', () => {
  const f = new NotFilter({
    filter: new EqualityFilter({
      attribute: 'foo',
      value: 'bar',
    }),
  });
  expect(f).toBeTruthy();
  expect(f.toString()).toBe('(!(foo=bar))');
});

test('match true', () => {
  const f = new NotFilter({
    filter: new EqualityFilter({
      attribute: 'foo',
      value: 'bar',
    }),
  });
  expect(f).toBeTruthy();
  expect(f.matches({ foo: 'baz' })).toBeTruthy();
});

test('match false', () => {
  const f = new NotFilter({
    filter: new EqualityFilter({
      attribute: 'foo',
      value: 'bar',
    }),
  });
  expect(f).toBeTruthy();
  expect(!f.matches({ foo: 'bar' })).toBeTruthy();
});
