// Copyright 2011 Mark Cavage, Inc.  All rights reserved.
'use strict';

const asn1 = require('asn1');

const BerReader = asn1.BerReader;
const BerWriter = asn1.BerWriter;
let getControl;
let PersistentSearchControl;

////////////////////
// Tests

test('load library', () => {
  PersistentSearchControl = require('../../lib').PersistentSearchControl;
  expect(PersistentSearchControl).toBeTruthy();
  getControl = require('../../lib').getControl;
  expect(getControl).toBeTruthy();
});

test('new no args', () => {
  expect(new PersistentSearchControl()).toBeTruthy();
});

test('new with args', () => {
  const c = new PersistentSearchControl({
    type: '2.16.840.1.113730.3.4.3',
    criticality: true,
    value: {
      changeTypes: 15,
      changesOnly: false,
      returnECs: false
    }
  });
  expect(c).toBeTruthy();
  expect(c.type).toBe('2.16.840.1.113730.3.4.3');
  expect(c.criticality).toBeTruthy();

  expect(c.value.changeTypes).toBe(15);
  expect(c.value.changesOnly).toBe(false);
  expect(c.value.returnECs).toBe(false);

  const writer = new BerWriter();
  c.toBer(writer);
  const reader = new BerReader(writer.buffer);
  const psc = getControl(reader);
  expect(psc).toBeTruthy();
  expect(psc.type).toBe('2.16.840.1.113730.3.4.3');
  expect(psc.criticality).toBeTruthy();
  expect(psc.value.changeTypes).toBe(15);
  expect(psc.value.changesOnly).toBe(false);
  expect(psc.value.returnECs).toBe(false);
});

test('getControl with args', () => {
  const buf = new Buffer([
    0x30, 0x26, 0x04, 0x17, 0x32, 0x2e, 0x31, 0x36, 0x2e, 0x38, 0x34, 0x30,
    0x2e, 0x31, 0x2e, 0x31, 0x31, 0x33, 0x37, 0x33, 0x30, 0x2e, 0x33, 0x2e,
    0x34, 0x2e, 0x33, 0x04, 0x0b, 0x30, 0x09, 0x02, 0x01, 0x0f, 0x01, 0x01,
    0xff, 0x01, 0x01, 0xff ]);

  const ber = new BerReader(buf);
  const psc = getControl(ber);
  expect(psc).toBeTruthy();
  expect(psc.type).toBe('2.16.840.1.113730.3.4.3');
  expect(psc.criticality).toBe(false);
  expect(psc.value.changeTypes).toBe(15);
  expect(psc.value.changesOnly).toBe(true);
  expect(psc.value.returnECs).toBe(true);
});

test('tober', () => {
  const psc = new PersistentSearchControl({
    type: '2.16.840.1.113730.3.4.3',
    criticality: true,
    value: {
      changeTypes: 15,
      changesOnly: false,
      returnECs: false
    }
  });

  const ber = new BerWriter();
  psc.toBer(ber);

  const c = getControl(new BerReader(ber.buffer));
  expect(c).toBeTruthy();
  expect(c.type).toBe('2.16.840.1.113730.3.4.3');
  expect(c.criticality).toBeTruthy();
  expect(c.value.changeTypes).toBe(15);
  expect(c.value.changesOnly).toBe(false);
  expect(c.value.returnECs).toBe(false);
});
