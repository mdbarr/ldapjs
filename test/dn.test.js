// Copyright 2011 Mark Cavage, Inc.  All rights reserved.
'use strict';

////////////////////
// Globals

let dn;

////////////////////
// Tests

test('load library', () => {
  dn = require('../lib/index').dn;
  expect(dn).toBeTruthy();
});

test('parse basic', () => {
  const DN_STR = 'cn=mark, ou=people, o=joyent';
  const name = dn.parse(DN_STR);
  expect(name).toBeTruthy();
  expect(name.rdns).toBeTruthy();
  expect(Array.isArray(name.rdns)).toBeTruthy();
  expect(3).toBe(name.rdns.length);
  name.rdns.forEach((rdn) => {
    expect('object').toBe(typeof rdn);
  });
  expect(name.toString()).toBe(DN_STR);
});

test('parse escaped', () => {
  const DN_STR = 'cn=m\\,ark, ou=people, o=joyent';
  const name = dn.parse(DN_STR);
  expect(name).toBeTruthy();
  expect(name.rdns).toBeTruthy();
  expect(Array.isArray(name.rdns)).toBeTruthy();
  expect(3).toBe(name.rdns.length);
  name.rdns.forEach((rdn) => {
    expect('object').toBe(typeof rdn);
  });
  expect(name.toString()).toBe(DN_STR);
});

test('parse compound', () => {
  const DN_STR = 'cn=mark+sn=cavage, ou=people, o=joyent';
  const name = dn.parse(DN_STR);
  expect(name).toBeTruthy();
  expect(name.rdns).toBeTruthy();
  expect(Array.isArray(name.rdns)).toBeTruthy();
  expect(3).toBe(name.rdns.length);
  name.rdns.forEach((rdn) => {
    expect('object').toBe(typeof rdn);
  });
  expect(name.toString()).toBe(DN_STR);
});

test('parse quoted', () => {
  const DN_STR = 'cn="mark+sn=cavage", ou=people, o=joyent';
  const ESCAPE_STR = 'cn=mark\\+sn\\=cavage, ou=people, o=joyent';
  const name = dn.parse(DN_STR);
  expect(name).toBeTruthy();
  expect(name.rdns).toBeTruthy();
  expect(Array.isArray(name.rdns)).toBeTruthy();
  expect(3).toBe(name.rdns.length);
  name.rdns.forEach((rdn) => {
    expect('object').toBe(typeof rdn);
  });
  expect(name.toString()).toBe(ESCAPE_STR);
});

test('equals', () => {
  const dn1 = dn.parse('cn=foo,dc=bar');
  expect(dn1.equals('cn=foo,dc=bar')).toBeTruthy();
  expect(!dn1.equals('cn=foo1,dc=bar')).toBeTruthy();
  expect(dn1.equals(dn.parse('cn=foo,dc=bar'))).toBeTruthy();
  expect(!dn1.equals(dn.parse('cn=foo2,dc=bar'))).toBeTruthy();
});

test('child of', () => {
  const dn1 = dn.parse('cn=foo,dc=bar');
  expect(dn1.childOf('dc=bar')).toBeTruthy();
  expect(!dn1.childOf('dc=moo')).toBeTruthy();
  expect(!dn1.childOf('dc=foo')).toBeTruthy();
  expect(!dn1.childOf('cn=foo,dc=bar')).toBeTruthy();

  expect(dn1.childOf(dn.parse('dc=bar'))).toBeTruthy();
});

test('parent of', () => {
  const dn1 = dn.parse('cn=foo,dc=bar');
  expect(dn1.parentOf('cn=moo,cn=foo,dc=bar')).toBeTruthy();
  expect(!dn1.parentOf('cn=moo,cn=bar,dc=foo')).toBeTruthy();
  expect(!dn1.parentOf('cn=foo,dc=bar')).toBeTruthy();

  expect(dn1.parentOf(dn.parse('cn=moo,cn=foo,dc=bar'))).toBeTruthy();
});

test('DN parent', () => {
  const _dn = dn.parse('cn=foo,ou=bar');
  const parent1 = _dn.parent();
  const parent2 = parent1.parent();
  expect(parent1.equals('ou=bar')).toBeTruthy();
  expect(parent2.equals('')).toBeTruthy();
  expect(parent2.parent()).toBe(null);
});

test('empty DNs', () => {
  const _dn = dn.parse('');
  const _dn2 = dn.parse('cn=foo');
  expect(_dn.isEmpty()).toBeTruthy();
  expect(_dn2.isEmpty()).toBeFalsy();
  expect(_dn.equals('cn=foo')).toBeFalsy();
  expect(_dn2.equals('')).toBeFalsy();
  expect(_dn.parentOf('cn=foo')).toBeTruthy();
  expect(_dn.childOf('cn=foo')).toBeFalsy();
  expect(_dn2.parentOf('')).toBeFalsy();
  expect(_dn2.childOf('')).toBeTruthy();
});

test('case insensitive attribute names', () => {
  const dn1 = dn.parse('CN=foo,dc=bar');
  expect(dn1.equals('cn=foo,dc=bar')).toBeTruthy();
  expect(dn1.equals(dn.parse('cn=foo,DC=bar'))).toBeTruthy();
});

test('format', () => {
  const DN_ORDER = dn.parse('sn=bar+cn=foo,ou=test');
  const DN_QUOTE = dn.parse('cn="foo",ou=test');
  const DN_QUOTE2 = dn.parse('cn=" foo",ou=test');
  const DN_SPACE = dn.parse('cn=foo,ou=test');
  const DN_SPACE2 = dn.parse('cn=foo ,ou=test');
  const DN_CASE = dn.parse('CN=foo,Ou=test');

  expect(DN_ORDER.format({ keepOrder: false })).toBe('cn=foo+sn=bar, ou=test');
  expect(DN_ORDER.format({ keepOrder: true })).toBe('sn=bar+cn=foo, ou=test');

  expect(DN_QUOTE.format({ keepQuote: false })).toBe('cn=foo, ou=test');
  expect(DN_QUOTE.format({ keepQuote: true })).toBe('cn="foo", ou=test');
  expect(DN_QUOTE2.format({ keepQuote: false })).toBe('cn=" foo", ou=test');
  expect(DN_QUOTE2.format({ keepQuote: true })).toBe('cn=" foo", ou=test');

  expect(DN_SPACE.format({ keepSpace: false })).toBe('cn=foo, ou=test');
  expect(DN_SPACE.format({ keepSpace: true })).toBe('cn=foo,ou=test');
  expect(DN_SPACE.format({ skipSpace: true })).toBe('cn=foo,ou=test');
  expect(DN_SPACE2.format({ keepSpace: false })).toBe('cn=foo, ou=test');
  expect(DN_SPACE2.format({ keepSpace: true })).toBe('cn=foo ,ou=test');
  expect(DN_SPACE2.format({ skipSpace: true })).toBe('cn=foo,ou=test');

  expect(DN_CASE.format({ keepCase: false })).toBe('cn=foo, ou=test');
  expect(DN_CASE.format({ keepCase: true })).toBe('CN=foo, Ou=test');
  expect(DN_CASE.format({ upperName: true })).toBe('CN=foo, OU=test');
});

test('set format', () => {
  const _dn = dn.parse('uid="user",  sn=bar+cn=foo, dc=test , DC=com');
  expect(_dn.toString()).toBe('uid=user, cn=foo+sn=bar, dc=test, dc=com');
  _dn.setFormat({ keepOrder: true });
  expect(_dn.toString()).toBe('uid=user, sn=bar+cn=foo, dc=test, dc=com');
  _dn.setFormat({ keepQuote: true });
  expect(_dn.toString()).toBe('uid="user", cn=foo+sn=bar, dc=test, dc=com');
  _dn.setFormat({ keepSpace: true });
  expect(_dn.toString()).toBe('uid=user,  cn=foo+sn=bar, dc=test , dc=com');
  _dn.setFormat({ keepCase: true });
  expect(_dn.toString()).toBe('uid=user, cn=foo+sn=bar, dc=test, DC=com');
  _dn.setFormat({ upperName: true });
  expect(_dn.toString()).toBe('UID=user, CN=foo+SN=bar, DC=test, DC=com');
});

test('format persists across clone', () => {
  const _dn = dn.parse('uid="user",  sn=bar+cn=foo, dc=test , DC=com');
  const OUT = 'UID="user", CN=foo+SN=bar, DC=test, DC=com';
  _dn.setFormat({
    keepQuote: true,
    upperName: true
  });
  const clone = _dn.clone();
  expect(_dn.toString()).toBe(OUT);
  expect(clone.toString()).toBe(OUT);
});

test('initialization', () => {
  const dn1 = new dn.DN();
  expect(dn1).toBeTruthy();
  expect(dn1.toString()).toBe('');
  expect(dn1.isEmpty()).toBeTruthy();

  const data = [
    new dn.RDN({ foo: 'bar' }),
    new dn.RDN({ o: 'base' })
  ];
  const dn2 = new dn.DN(data);
  expect(dn2).toBeTruthy();
  expect(dn2.toString()).toBe('foo=bar, o=base');
  expect(!dn2.isEmpty()).toBeTruthy();
});

test('array functions', () => {
  const dn1 = dn.parse('a=foo, b=bar, c=baz');
  expect(dn1).toBeTruthy();
  expect(dn1.toString()).toBe('a=foo, b=bar, c=baz');

  expect(dn1.reverse()).toBeTruthy();
  expect(dn1.toString()).toBe('c=baz, b=bar, a=foo');

  let rdn = dn1.pop();
  expect(rdn).toBeTruthy();
  expect(dn1.toString()).toBe('c=baz, b=bar');

  expect(dn1.push(rdn)).toBeTruthy();
  expect(dn1.toString()).toBe('c=baz, b=bar, a=foo');

  rdn = dn1.shift();
  expect(rdn).toBeTruthy();
  expect(dn1.toString()).toBe('b=bar, a=foo');

  expect(dn1.unshift(rdn)).toBeTruthy();
  expect(dn1.toString()).toBe('c=baz, b=bar, a=foo');
});

test('isDN duck-testing', () => {
  const valid = dn.parse('cn=foo');
  const isDN = dn.DN.isDN;
  expect(isDN(null)).toBeFalsy();
  expect(isDN('cn=foo')).toBeFalsy();
  expect(isDN(valid)).toBeTruthy();
  const duck = {
    rdns: [ { look: 'ma' }, { a: 'dn' } ],
    toString () { return 'look=ma, a=dn'; }
  };
  expect(isDN(duck)).toBeTruthy();
});
