'use strict';

const test = require('tap').test;

const asn1 = require('asn1');

const BerReader = asn1.BerReader;
const BerWriter = asn1.BerWriter;
let getControl;
let EntryChangeNotificationControl;

////////////////////
// Tests

test('load library', (t) => {
  EntryChangeNotificationControl =
    require('../../lib').EntryChangeNotificationControl;
  t.ok(EntryChangeNotificationControl);
  getControl = require('../../lib').getControl;
  t.ok(getControl);
  t.end();
});

test('new no args', (t) => {
  t.ok(new EntryChangeNotificationControl());
  t.end();
});

test('new with args', (t) => {
  const c = new EntryChangeNotificationControl({
    type: '2.16.840.1.113730.3.4.7',
    criticality: true,
    value: {
      changeType: 8,
      previousDN: 'cn=foobarbazcar',
      changeNumber: 123456789,
    },
  });
  t.ok(c);
  t.equal(c.type, '2.16.840.1.113730.3.4.7');
  t.ok(c.criticality);
  t.equal(c.value.changeType, 8);
  t.equal(c.value.previousDN, 'cn=foobarbazcar');
  t.equal(c.value.changeNumber, 123456789);

  const writer = new BerWriter();
  c.toBer(writer);
  const reader = new BerReader(writer.buffer);
  const psc = getControl(reader);
  t.ok(psc);
  console.log('psc', psc.value);
  t.equal(psc.type, '2.16.840.1.113730.3.4.7');
  t.ok(psc.criticality);
  t.equal(psc.value.changeType, 8);
  t.equal(psc.value.previousDN, 'cn=foobarbazcar');
  t.equal(psc.value.changeNumber, 123456789);

  t.end();
});

test('tober', (t) => {
  const psc = new EntryChangeNotificationControl({
    type: '2.16.840.1.113730.3.4.7',
    criticality: true,
    value: {
      changeType: 8,
      previousDN: 'cn=foobarbazcar',
      changeNumber: 123456789,
    },
  });

  const ber = new BerWriter();
  psc.toBer(ber);

  const c = getControl(new BerReader(ber.buffer));
  t.ok(c);
  t.equal(c.type, '2.16.840.1.113730.3.4.7');
  t.ok(c.criticality);
  t.equal(c.value.changeType, 8);
  t.equal(c.value.previousDN, 'cn=foobarbazcar');
  t.equal(c.value.changeNumber, 123456789);

  t.end();
});
