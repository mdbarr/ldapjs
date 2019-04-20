// Copyright 2011 Mark Cavage, Inc.  All rights reserved.
'use strict';

const parse = require('../../lib/index').parseFilter;

test('GH-48 XML Strings in filter', () => {
  const str = '(&(CentralUIEnrollments=<mydoc>*)(objectClass=User))';
  const f = parse(str);
  expect(f).toBeTruthy();
  expect(f.filters).toBeTruthy();
  expect(f.filters.length).toBe(2);
  f.filters.forEach((filter) => {
    expect(filter.attribute).toBeTruthy();
  });
});

test('GH-50 = in filter', () => {
  const str = '(uniquemember=uuid=930896af-bf8c-48d4-885c-6573a94b1853, ' +
    'ou=users, o=smartdc)';
  const f = parse(str);
  expect(f).toBeTruthy();
  expect(f.attribute).toBe('uniquemember');
  expect(f.value).toBe('uuid=930896af-bf8c-48d4-885c-6573a94b1853, ou=users, o=smartdc');
});

test('* substr filter (prefix)', () => {
  const str = '(foo=bar*)';
  const f = parse(str);
  expect(f).toBeTruthy();
  expect(f.attribute).toBe('foo');
  expect(f.initial).toBe('bar');
  expect(f.toString()).toBe('(foo=bar*)');
});

test('GH-53 NotFilter', () => {
  const str = '(&(objectClass=person)(!(objectClass=shadowAccount)))';
  const f = parse(str);
  expect(f).toBeTruthy();
  expect(f.type).toBe('and');
  expect(f.filters.length).toBe(2);
  expect(f.filters[0].type).toBe('equal');
  expect(f.filters[1].type).toBe('not');
  expect(f.filters[1].filter.type).toBe('equal');
  expect(f.filters[1].filter.attribute).toBe('objectClass');
  expect(f.filters[1].filter.value).toBe('shadowAccount');
});

test('presence filter', () => {
  const f = parse('(foo=*)');
  expect(f).toBeTruthy();
  expect(f.type).toBe('present');
  expect(f.attribute).toBe('foo');
  expect(f.toString()).toBe('(foo=*)');
});

test('bogus filter', () => {
  expect(() => {
    parse('foo>1');
  }).toThrow();
});

test('bogus filter !=', () => {
  expect(() => {
    parse('foo!=1');
  }).toThrow();
});

test('mismatched parens', () => {
  expect(() => {
    parse('(&(foo=bar)(!(state=done))');
  }).toThrow();
});
