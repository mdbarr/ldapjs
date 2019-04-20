// Copyright 2011 Mark Cavage, Inc.  All rights reserved.
'use strict';

const asn1 = require('asn1');

////////////////////
// Globals

const BerReader = asn1.BerReader;
const BerWriter = asn1.BerWriter;
let Control;
let getControl;

////////////////////
// Tests

test('load library', () => {
  Control = require('../../lib/index').Control;
  expect(Control).toBeTruthy();
  getControl = require('../../lib/index').getControl;
  expect(getControl).toBeTruthy();
});

test('new no args', () => {
  expect(new Control()).toBeTruthy();
});

test('new with args', () => {
  const c = new Control({
    type: '2.16.840.1.113730.3.4.2',
    criticality: true
  });
  expect(c).toBeTruthy();
  expect(c.type).toBe('2.16.840.1.113730.3.4.2');
  expect(c.criticality).toBeTruthy();
});

test('parse', () => {
  const ber = new BerWriter();
  ber.startSequence();
  ber.writeString('2.16.840.1.113730.3.4.2');
  ber.writeBoolean(true);
  ber.writeString('foo');
  ber.endSequence();

  const c = getControl(new BerReader(ber.buffer));

  expect(c).toBeTruthy();
  expect(c.type).toBe('2.16.840.1.113730.3.4.2');
  expect(c.criticality).toBeTruthy();
  expect(c.value.toString('utf8')).toBe('foo');
});

test('parse no value', () => {
  const ber = new BerWriter();
  ber.startSequence();
  ber.writeString('2.16.840.1.113730.3.4.2');
  ber.endSequence();

  const c = getControl(new BerReader(ber.buffer));

  expect(c).toBeTruthy();
  expect(c.type).toBe('2.16.840.1.113730.3.4.2');
  expect(c.criticality).toBe(false);
  expect(c.value).toBeFalsy();
});
