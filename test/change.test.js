// Copyright 2011 Mark Cavage, Inc.  All rights reserved.
'use strict';

const asn1 = require('asn1');

////////////////////
// Globals

const BerReader = asn1.BerReader;
const BerWriter = asn1.BerWriter;
let Attribute;
let Change;

////////////////////
// Tests

test('load library', () => {
  Attribute = require('../lib/index').Attribute;
  Change = require('../lib/index').Change;
  expect(Attribute).toBeTruthy();
  expect(Change).toBeTruthy();
});

test('new no args', () => {
  expect(new Change()).toBeTruthy();
});

test('new with args', () => {
  const change = new Change({
    operation: 'add',
    modification: new Attribute({
      type: 'cn',
      vals: [ 'foo', 'bar' ]
    })
  });
  expect(change).toBeTruthy();

  expect(change.operation).toBe('add');
  expect(change.modification.type).toBe('cn');
  expect(change.modification.vals.length).toBe(2);
  expect(change.modification.vals[0]).toBe('foo');
  expect(change.modification.vals[1]).toBe('bar');
});

test('validate fields', () => {
  const c = new Change();
  expect(c).toBeTruthy();
  expect(() => {
    c.operation = 'bogus';
  }).toThrow();
  expect(() => {
    c.modification = {
      too: 'many',
      fields: 'here'
    };
  }).toThrow();
  c.modification = { foo: [ 'bar', 'baz' ] };
  expect(c.modification).toBeTruthy();
});

test('GH-31 (multiple attributes per Change)', () => {
  expect(() => {
    const c = new Change({
      operation: 'replace',
      modification: {
        cn: 'foo',
        sn: 'bar'
      }
    });
    expect(c).toBeFalsy();
  }).toThrow();
});

test('toBer', () => {
  const change = new Change({
    operation: 'Add',
    modification: new Attribute({
      type: 'cn',
      vals: [ 'foo', 'bar' ]
    })
  });
  expect(change).toBeTruthy();

  const ber = new BerWriter();
  change.toBer(ber);
  const reader = new BerReader(ber.buffer);
  expect(reader.readSequence()).toBeTruthy();
  expect(reader.readEnumeration()).toBe(0x00);
  expect(reader.readSequence()).toBeTruthy();
  expect(reader.readString()).toBe('cn');
  expect(reader.readSequence()).toBe(0x31); // lber set
  expect(reader.readString()).toBe('foo');
  expect(reader.readString()).toBe('bar');
});

test('parse', () => {
  const ber = new BerWriter();
  ber.startSequence();
  ber.writeEnumeration(0x00);
  ber.startSequence();
  ber.writeString('cn');
  ber.startSequence(0x31);
  ber.writeStringArray([ 'foo', 'bar' ]);
  ber.endSequence();
  ber.endSequence();
  ber.endSequence();

  const change = new Change();
  expect(change).toBeTruthy();
  expect(change.parse(new BerReader(ber.buffer))).toBeTruthy();

  expect(change.operation).toBe('add');
  expect(change.modification.type).toBe('cn');
  expect(change.modification.vals.length).toBe(2);
  expect(change.modification.vals[0]).toBe('foo');
  expect(change.modification.vals[1]).toBe('bar');
});

test('apply - replace', () => {
  let res;
  const single = new Change({
    operation: 'replace',
    modification: {
      type: 'cn',
      vals: [ 'new' ]
    }
  });
  const twin = new Change({
    operation: 'replace',
    modification: {
      type: 'cn',
      vals: [ 'new', 'two' ]
    }
  });
  const empty = new Change({
    operation: 'replace',
    modification: {
      type: 'cn',
      vals: []
    }
  });

  // plain
  res = Change.apply(single, { cn: [ 'old' ] });
  expect(res.cn).toEqual([ 'new' ]);

  // multiple
  res = Change.apply(single, { cn: [ 'old', 'also' ] });
  expect(res.cn).toEqual([ 'new' ]);

  // empty
  res = Change.apply(empty, { cn: [ 'existing' ] });
  expect(res.cn).toBe(undefined);
  expect(Object.keys(res).indexOf('cn') === -1).toBeTruthy();

  //absent
  res = Change.apply(single, { dn: [ 'otherjunk' ] });
  expect(res.cn).toEqual([ 'new' ]);

  // scalar formatting "success"
  res = Change.apply(single, { cn: 'old' }, true);
  expect(res.cn).toBe('new');

  // scalar formatting "failure"
  res = Change.apply(twin, { cn: 'old' }, true);
  expect(res.cn).toEqual([ 'new', 'two' ]);
});

test('apply - add', () => {
  let res;
  const single = new Change({
    operation: 'add',
    modification: {
      type: 'cn',
      vals: [ 'new' ]
    }
  });

  // plain
  res = Change.apply(single, { cn: [ 'old' ] });
  expect(res.cn).toEqual([ 'old', 'new' ]);

  // multiple
  res = Change.apply(single, { cn: [ 'old', 'also' ] });
  expect(res.cn).toEqual([ 'old', 'also', 'new' ]);

  //absent
  res = Change.apply(single, { dn: [ 'otherjunk' ] });
  expect(res.cn).toEqual([ 'new' ]);

  // scalar formatting "success"
  res = Change.apply(single, { }, true);
  expect(res.cn).toBe('new');

  // scalar formatting "failure"
  res = Change.apply(single, { cn: 'old' }, true);
  expect(res.cn).toEqual([ 'old', 'new' ]);

  // duplicate add
  res = Change.apply(single, { cn: 'new' });
  expect(res.cn).toEqual([ 'new' ]);
});

test('apply - delete', () => {
  let res;
  const single = new Change({
    operation: 'delete',
    modification: {
      type: 'cn',
      vals: [ 'old' ]
    }
  });

  // plain
  res = Change.apply(single, { cn: [ 'old', 'new' ] });
  expect(res.cn).toEqual([ 'new' ]);

  // empty
  res = Change.apply(single, { cn: [ 'old' ] });
  expect(res.cn).toBe(undefined);
  expect(Object.keys(res).indexOf('cn') === -1).toBeTruthy();

  // scalar formatting "success"
  res = Change.apply(single, { cn: [ 'old', 'one' ] }, true);
  expect(res.cn).toBe('one');

  // scalar formatting "failure"
  res = Change.apply(single, { cn: [ 'old', 'several', 'items' ] }, true);
  expect(res.cn).toEqual([ 'several', 'items' ]);

  //absent
  res = Change.apply(single, { dn: [ 'otherjunk' ] });
  expect(res).toBeTruthy();
  expect(res.cn).toBe(undefined);
});
