// Copyright 2011 Mark Cavage, Inc.  All rights reserved.
'use strict';

const test = require('tape').test;

const asn1 = require('asn1');

////////////////////
// Globals

const BerReader = asn1.BerReader;
const BerWriter = asn1.BerWriter;
let Control;
let getControl;

////////////////////
// Tests

test('load library', (t) => {
  Control = require('../../lib/index').Control;
  t.ok(Control);
  getControl = require('../../lib/index').getControl;
  t.ok(getControl);
  t.end();
});

test('new no args', (t) => {
  t.ok(new Control());
  t.end();
});

test('new with args', (t) => {
  const c = new Control({
    type: '2.16.840.1.113730.3.4.2',
    criticality: true
  });
  t.ok(c);
  t.equal(c.type, '2.16.840.1.113730.3.4.2');
  t.ok(c.criticality);
  t.end();
});

test('parse', (t) => {
  const ber = new BerWriter();
  ber.startSequence();
  ber.writeString('2.16.840.1.113730.3.4.2');
  ber.writeBoolean(true);
  ber.writeString('foo');
  ber.endSequence();

  const c = getControl(new BerReader(ber.buffer));

  t.ok(c);
  t.equal(c.type, '2.16.840.1.113730.3.4.2');
  t.ok(c.criticality);
  t.equal(c.value.toString('utf8'), 'foo');
  t.end();
});

test('parse no value', (t) => {
  const ber = new BerWriter();
  ber.startSequence();
  ber.writeString('2.16.840.1.113730.3.4.2');
  ber.endSequence();

  const c = getControl(new BerReader(ber.buffer));

  t.ok(c);
  t.equal(c.type, '2.16.840.1.113730.3.4.2');
  t.equal(c.criticality, false);
  t.notOk(c.value, null);
  t.end();
});
