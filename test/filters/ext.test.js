// Copyright 2011 Mark Cavage, Inc.  All rights reserved.
'use strict';

////////////////////
// Globals

let ExtensibleFilter;
let filters;

////////////////////
// Tests

test('load library', () => {
  filters = require('../../lib/index').filters;
  expect(filters).toBeTruthy();
  ExtensibleFilter = filters.ExtensibleFilter;
  expect(ExtensibleFilter).toBeTruthy();
});

test('Construct no args', () => {
  const f = new ExtensibleFilter();
  expect(f).toBeTruthy();
});

test('Construct args', () => {
  const f = new ExtensibleFilter({
    matchType: 'foo',
    value: 'bar',
  });
  expect(f).toBeTruthy();
  expect(f.matchType).toBe('foo');
  expect(f.value).toBe('bar');
  expect(f.toString()).toBe('(foo:=bar)');
});

test('parse RFC example 1', () => {
  const f = filters.parseString('(cn:caseExactMatch:=Fred Flintstone)');
  expect(f).toBeTruthy();
  expect(f.matchType).toBe('cn');
  expect(f.matchingRule).toBe('caseExactMatch');
  expect(f.matchValue).toBe('Fred Flintstone');
  expect(f.dnAttributes).toBeFalsy();
});

test('parse RFC example 2', () => {
  const f = filters.parseString('(cn:=Betty Rubble)');
  expect(f).toBeTruthy();
  expect(f.matchType).toBe('cn');
  expect(f.matchValue).toBe('Betty Rubble');
  expect(f.dnAttributes).toBeFalsy();
  expect(f.matchingRule).toBeFalsy();
});

test('parse RFC example 3', () => {
  const f = filters.parseString('(sn:dn:2.4.6.8.10:=Barney Rubble)');
  expect(f).toBeTruthy();
  expect(f.matchType).toBe('sn');
  expect(f.matchingRule).toBe('2.4.6.8.10');
  expect(f.matchValue).toBe('Barney Rubble');
  expect(f.dnAttributes).toBeTruthy();
});

test('parse RFC example 3', () => {
  const f = filters.parseString('(o:dn:=Ace Industry)');
  expect(f).toBeTruthy();
  expect(f.matchType).toBe('o');
  expect(f.matchingRule).toBeFalsy();
  expect(f.matchValue).toBe('Ace Industry');
  expect(f.dnAttributes).toBeTruthy();
});

test('parse RFC example 4', () => {
  const f = filters.parseString('(:1.2.3:=Wilma Flintstone)');
  expect(f).toBeTruthy();
  expect(f.matchType).toBeFalsy();
  expect(f.matchingRule).toBe('1.2.3');
  expect(f.matchValue).toBe('Wilma Flintstone');
  expect(f.dnAttributes).toBeFalsy();
});

test('parse RFC example 5', () => {
  const f = filters.parseString('(:DN:2.4.6.8.10:=Dino)');
  expect(f).toBeTruthy();
  expect(f.matchType).toBeFalsy();
  expect(f.matchingRule).toBe('2.4.6.8.10');
  expect(f.matchValue).toBe('Dino');
  expect(f.dnAttributes).toBeTruthy();
});
