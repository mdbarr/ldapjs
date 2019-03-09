// Copyright 2011 Mark Cavage, Inc.  All rights reserved.
'use strict';

const test = require('tape').test;

const asn1 = require('asn1');

////////////////////
// Globals

const BerReader = asn1.BerReader;
const BerWriter = asn1.BerWriter;
let Attribute;
let Change;

////////////////////
// Tests

test('load library', (t) => {
  Attribute = require('../lib/index').Attribute;
  Change = require('../lib/index').Change;
  t.ok(Attribute);
  t.ok(Change);
  t.end();
});

test('new no args', (t) => {
  t.ok(new Change());
  t.end();
});

test('new with args', (t) => {
  const change = new Change({
    operation: 'add',
    modification: new Attribute({
      type: 'cn',
      vals: [ 'foo', 'bar' ]
    })
  });
  t.ok(change);

  t.equal(change.operation, 'add');
  t.equal(change.modification.type, 'cn');
  t.equal(change.modification.vals.length, 2);
  t.equal(change.modification.vals[0], 'foo');
  t.equal(change.modification.vals[1], 'bar');

  t.end();
});

test('validate fields', (t) => {
  const c = new Change();
  t.ok(c);
  t.throws(() => {
    c.operation = 'bogus';
  });
  t.throws(() => {
    c.modification = {
      too: 'many',
      fields: 'here'
    };
  });
  c.modification = { foo: [ 'bar', 'baz' ] };
  t.ok(c.modification);
  t.end();
});

test('GH-31 (multiple attributes per Change)', (t) => {
  t.throws(() => {
    const c = new Change({
      operation: 'replace',
      modification: {
        cn: 'foo',
        sn: 'bar'
      }
    });
    t.notOk(c);
  });
  t.end();
});

test('toBer', (t) => {
  const change = new Change({
    operation: 'Add',
    modification: new Attribute({
      type: 'cn',
      vals: [ 'foo', 'bar' ]
    })
  });
  t.ok(change);

  const ber = new BerWriter();
  change.toBer(ber);
  const reader = new BerReader(ber.buffer);
  t.ok(reader.readSequence());
  t.equal(reader.readEnumeration(), 0x00);
  t.ok(reader.readSequence());
  t.equal(reader.readString(), 'cn');
  t.equal(reader.readSequence(), 0x31); // lber set
  t.equal(reader.readString(), 'foo');
  t.equal(reader.readString(), 'bar');
  t.end();
});

test('parse', (t) => {
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
  t.ok(change);
  t.ok(change.parse(new BerReader(ber.buffer)));

  t.equal(change.operation, 'add');
  t.equal(change.modification.type, 'cn');
  t.equal(change.modification.vals.length, 2);
  t.equal(change.modification.vals[0], 'foo');
  t.equal(change.modification.vals[1], 'bar');

  t.end();
});

test('apply - replace', (t) => {
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
  t.deepEqual(res.cn, [ 'new' ]);

  // multiple
  res = Change.apply(single, { cn: [ 'old', 'also' ] });
  t.deepEqual(res.cn, [ 'new' ]);

  // empty
  res = Change.apply(empty, { cn: [ 'existing' ] });
  t.equal(res.cn, undefined);
  t.ok(Object.keys(res).indexOf('cn') === -1);

  //absent
  res = Change.apply(single, { dn: [ 'otherjunk' ] });
  t.deepEqual(res.cn, [ 'new' ]);

  // scalar formatting "success"
  res = Change.apply(single, { cn: 'old' }, true);
  t.equal(res.cn, 'new');

  // scalar formatting "failure"
  res = Change.apply(twin, { cn: 'old' }, true);
  t.deepEqual(res.cn, [ 'new', 'two' ]);

  t.end();
});

test('apply - add', (t) => {
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
  t.deepEqual(res.cn, [ 'old', 'new' ]);

  // multiple
  res = Change.apply(single, { cn: [ 'old', 'also' ] });
  t.deepEqual(res.cn, [ 'old', 'also', 'new' ]);

  //absent
  res = Change.apply(single, { dn: [ 'otherjunk' ] });
  t.deepEqual(res.cn, [ 'new' ]);

  // scalar formatting "success"
  res = Change.apply(single, { }, true);
  t.equal(res.cn, 'new');

  // scalar formatting "failure"
  res = Change.apply(single, { cn: 'old' }, true);
  t.deepEqual(res.cn, [ 'old', 'new' ]);

  // duplicate add
  res = Change.apply(single, { cn: 'new' });
  t.deepEqual(res.cn, [ 'new' ]);

  t.end();
});

test('apply - delete', (t) => {
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
  t.deepEqual(res.cn, [ 'new' ]);

  // empty
  res = Change.apply(single, { cn: [ 'old' ] });
  t.equal(res.cn, undefined);
  t.ok(Object.keys(res).indexOf('cn') === -1);

  // scalar formatting "success"
  res = Change.apply(single, { cn: [ 'old', 'one' ] }, true);
  t.equal(res.cn, 'one');

  // scalar formatting "failure"
  res = Change.apply(single, { cn: [ 'old', 'several', 'items' ] }, true);
  t.deepEqual(res.cn, [ 'several', 'items' ]);

  //absent
  res = Change.apply(single, { dn: [ 'otherjunk' ] });
  t.ok(res);
  t.equal(res.cn, undefined);

  t.end();
});
