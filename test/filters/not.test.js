// Copyright 2011 Mark Cavage, Inc.  All rights reserved.
'use strict';

const test = require('tape').test;

const asn1 = require('asn1');

///--- Globals

let EqualityFilter;
let NotFilter;

///--- Tests

test('load library', function (t) {
  const filters = require('../../lib/index').filters;
  t.ok(filters);
  EqualityFilter = filters.EqualityFilter;
  NotFilter = filters.NotFilter;
  t.ok(EqualityFilter);
  t.ok(NotFilter);
  t.end();
});

test('Construct no args', function (t) {
  t.ok(new NotFilter());
  t.end();
});

test('Construct args', function (t) {
  const f = new NotFilter({
    filter: new EqualityFilter({
      attribute: 'foo',
      value: 'bar'
    })
  });
  t.ok(f);
  t.equal(f.toString(), '(!(foo=bar))');
  t.end();
});

test('match true', function (t) {
  const f = new NotFilter({
    filter: new EqualityFilter({
      attribute: 'foo',
      value: 'bar'
    })
  });
  t.ok(f);
  t.ok(f.matches({
    foo: 'baz'
  }));
  t.end();
});

test('match false', function (t) {
  const f = new NotFilter({
    filter: new EqualityFilter({
      attribute: 'foo',
      value: 'bar'
    })
  });
  t.ok(f);
  t.ok(!f.matches({
    foo: 'bar'
  }));
  t.end();
});
