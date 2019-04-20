'use strict';

const asn1 = require('asn1');

const BerReader = asn1.BerReader;
const BerWriter = asn1.BerWriter;
let getControl;
let SSSRControl;

////////////////////
// Tests

test('load library', () => {
  SSSRControl = require('../../lib').ServerSideSortingRequestControl;
  expect(SSSRControl).toBeTruthy();
  getControl = require('../../lib').getControl;
  expect(getControl).toBeTruthy();
});

test('new no args', () => {
  expect(new SSSRControl()).toBeTruthy();
});

test('new with args', () => {
  const c = new SSSRControl({
    criticality: true,
    value: { attributeType: 'sn' }
  });
  expect(c).toBeTruthy();
  expect(c.type).toBe('1.2.840.113556.1.4.473');
  expect(c.criticality).toBeTruthy();
  expect(c.value.length).toBe(1);
  expect(c.value[0].attributeType).toBe('sn');
});

test('toBer - object', () => {
  const sssc = new SSSRControl({
    criticality: true,
    value: {
      attributeType: 'sn',
      orderingRule: 'caseIgnoreOrderingMatch',
      reverseOrder: true
    }
  });

  const ber = new BerWriter();
  sssc.toBer(ber);

  const c = getControl(new BerReader(ber.buffer));
  expect(c).toBeTruthy();
  expect(c.type).toBe('1.2.840.113556.1.4.473');
  expect(c.criticality).toBeTruthy();
  expect(c.value[0].attributeType).toBe('sn');
  expect(c.value[0].orderingRule).toBe('caseIgnoreOrderingMatch');
  expect(c.value[0].reverseOrder).toBe(true);
});

test('toBer - array', () => {
  const sssc = new SSSRControl({
    criticality: true,
    value: [
      {
        attributeType: 'sn',
        orderingRule: 'caseIgnoreOrderingMatch',
        reverseOrder: true
      },
      {
        attributeType: 'givenName',
        orderingRule: 'caseIgnoreOrderingMatch'
      }
    ]
  });

  const ber = new BerWriter();
  sssc.toBer(ber);

  const c = getControl(new BerReader(ber.buffer));
  expect(c).toBeTruthy();
  expect(c.type).toBe('1.2.840.113556.1.4.473');
  expect(c.criticality).toBeTruthy();
  expect(c.value.length).toBe(2);
  expect(c.value[0].attributeType).toBe('sn');
  expect(c.value[0].orderingRule).toBe('caseIgnoreOrderingMatch');
  expect(c.value[0].reverseOrder).toBe(true);
  expect(c.value[1].attributeType).toBe('givenName');
  expect(c.value[1].orderingRule).toBe('caseIgnoreOrderingMatch');
});

test('toBer - empty', () => {
  const sssc = new SSSRControl();
  const ber = new BerWriter();
  sssc.toBer(ber);

  const c = getControl(new BerReader(ber.buffer));
  expect(c).toBeTruthy();
  expect(c.type).toBe('1.2.840.113556.1.4.473');
  expect(c.value.length).toBe(0);
});
