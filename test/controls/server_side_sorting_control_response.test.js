'use strict';

const asn1 = require('asn1');

const BerReader = asn1.BerReader;
const BerWriter = asn1.BerWriter;
let ldap;
let getControl;
let SSSResponseControl;
const OID = '1.2.840.113556.1.4.474';

////////////////////
// Tests

test('load library', () => {
  ldap = require('../../lib');
  SSSResponseControl = ldap.ServerSideSortingResponseControl;
  expect(SSSResponseControl).toBeTruthy();
  getControl = ldap.getControl;
  expect(getControl).toBeTruthy();
});

test('new no args', () => {
  const c = new SSSResponseControl();
  expect(c).toBeTruthy();
  expect(c.type).toBe(OID);
  expect(c.criticality).toBe(false);
});

test('new with args', () => {
  const c = new SSSResponseControl({
    criticality: true,
    value: {
      result: ldap.LDAP_SUCCESS,
      failedAttribute: 'cn'
    }
  });
  expect(c).toBeTruthy();
  expect(c.type).toBe(OID);
  expect(c.criticality).toBe(false);
  expect(c.value.result).toBe(ldap.LDAP_SUCCESS);
  expect(c.value.failedAttribute).toBe('cn');
});

test('toBer - success', () => {
  const sssc = new SSSResponseControl({ value: {
    result: ldap.LDAP_SUCCESS,
    failedAttribute: 'foobar'
  } });

  const ber = new BerWriter();
  sssc.toBer(ber);

  const c = getControl(new BerReader(ber.buffer));
  expect(c).toBeTruthy();
  expect(c.type).toBe('1.2.840.113556.1.4.474');
  expect(c.criticality).toBe(false);
  expect(c.value.result).toBe(ldap.LDAP_SUCCESS);
  expect(c.value.failedAttribute).toBeFalsy();
});

test('toBer - simple failure', () => {
  const sssc = new SSSResponseControl({ value: { result: ldap.LDAP_NO_SUCH_ATTRIBUTE } });

  const ber = new BerWriter();
  sssc.toBer(ber);

  const c = getControl(new BerReader(ber.buffer));
  expect(c).toBeTruthy();
  expect(c.type).toBe(OID);
  expect(c.criticality).toBe(false);
  expect(c.value.result).toBe(ldap.LDAP_NO_SUCH_ATTRIBUTE);
  expect(c.value.failedAttribute).toBeFalsy();
});

test('toBer - detailed failure', () => {
  const sssc = new SSSResponseControl({ value: {
    result: ldap.LDAP_NO_SUCH_ATTRIBUTE,
    failedAttribute: 'foobar'
  } });

  const ber = new BerWriter();
  sssc.toBer(ber);

  const c = getControl(new BerReader(ber.buffer));
  expect(c).toBeTruthy();
  expect(c.type).toBe(OID);
  expect(c.criticality).toBe(false);
  expect(c.value.result).toBe(ldap.LDAP_NO_SUCH_ATTRIBUTE);
  expect(c.value.failedAttribute).toBe('foobar');
});

test('toBer - empty', () => {
  const sssc = new SSSResponseControl();
  const ber = new BerWriter();
  sssc.toBer(ber);

  const c = getControl(new BerReader(ber.buffer));
  expect(c).toBeTruthy();
  expect(c.type).toBe(OID);
  expect(c.criticality).toBe(false);
  expect(c.value.result).toBeFalsy();
  expect(c.value.failedAttribute).toBeFalsy();
});
