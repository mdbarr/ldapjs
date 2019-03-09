// Copyright 2011 Mark Cavage, Inc.  All rights reserved.
'use strict';

const test = require('tape').test;

////////////////////
// Globals

let EqualityFilter;
let NotFilter;

////////////////////
// Tests

test('load library', (t) => {
  const filters = require('../../lib/index').filters;
  t.ok(filters);
  EqualityFilter = filters.EqualityFilter;
  NotFilter = filters.NotFilter;
  t.ok(EqualityFilter);
  t.ok(NotFilter);
  t.end();
});

test('Construct no args', (t) => {
  t.ok(new NotFilter());
  t.end();
});

test('Construct args', (t) => {
  const f = new NotFilter({ filter: new EqualityFilter({
    attribute: 'foo',
    value: 'bar'
  }) });
  t.ok(f);
  t.equal(f.toString(), '(!(foo=bar))');
  t.end();
});

test('match true', (t) => {
  const f = new NotFilter({ filter: new EqualityFilter({
    attribute: 'foo',
    value: 'bar'
  }) });
  t.ok(f);
  t.ok(f.matches({ foo: 'baz' }));
  t.end();
});

test('match false', (t) => {
  const f = new NotFilter({ filter: new EqualityFilter({
    attribute: 'foo',
    value: 'bar'
  }) });
  t.ok(f);
  t.ok(!f.matches({ foo: 'bar' }));
  t.end();
});
