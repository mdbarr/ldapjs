// Copyright 2011 Mark Cavage, Inc.  All rights reserved.
'use strict';

const test = require('tape').test;

const parse = require('../../lib/index').parseFilter;

test('GH-48 XML Strings in filter', (t) => {
  const str = '(&(CentralUIEnrollments=<mydoc>*)(objectClass=User))';
  const f = parse(str);
  t.ok(f);
  t.ok(f.filters);
  t.equal(f.filters.length, 2);
  f.filters.forEach((filter) => {
    t.ok(filter.attribute);
  });
  t.end();
});

test('GH-50 = in filter', (t) => {
  const str = '(uniquemember=uuid=930896af-bf8c-48d4-885c-6573a94b1853, ' +
    'ou=users, o=smartdc)';
  const f = parse(str);
  t.ok(f);
  t.equal(f.attribute, 'uniquemember');
  t.equal(f.value,
    'uuid=930896af-bf8c-48d4-885c-6573a94b1853, ou=users, o=smartdc');
  t.end();
});

test('* substr filter (prefix)', (t) => {
  const str = '(foo=bar*)';
  const f = parse(str);
  t.ok(f);
  t.equal(f.attribute, 'foo');
  t.equal(f.initial, 'bar');
  t.equal(f.toString(), '(foo=bar*)');
  t.end();
});

test('GH-53 NotFilter', (t) => {
  const str = '(&(objectClass=person)(!(objectClass=shadowAccount)))';
  const f = parse(str);
  t.ok(f);
  t.equal(f.type, 'and');
  t.equal(f.filters.length, 2);
  t.equal(f.filters[0].type, 'equal');
  t.equal(f.filters[1].type, 'not');
  t.equal(f.filters[1].filter.type, 'equal');
  t.equal(f.filters[1].filter.attribute, 'objectClass');
  t.equal(f.filters[1].filter.value, 'shadowAccount');
  t.end();
});

test('presence filter', (t) => {
  const f = parse('(foo=*)');
  t.ok(f);
  t.equal(f.type, 'present');
  t.equal(f.attribute, 'foo');
  t.equal(f.toString(), '(foo=*)');
  t.end();
});

test('bogus filter', (t) => {
  t.throws(() => {
    parse('foo>1');
  });
  t.end();
});

test('bogus filter !=', (t) => {
  t.throws(() => {
    parse('foo!=1');
  });
  t.end();
});

test('mismatched parens', (t) => {
  t.throws(() => {
    parse('(&(foo=bar)(!(state=done))');
  });
  t.end();
});
