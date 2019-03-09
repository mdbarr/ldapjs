// Copyright 2011 Mark Cavage, Inc.  All rights reserved.
'use strict';

const test = require('tape').test;

const asn1 = require('asn1');

////////////////////
// Globals

const BerReader = asn1.BerReader;
const BerWriter = asn1.BerWriter;
let ExtendedRequest;
let dn;

////////////////////
// Tests

test('load library', (t) => {
  ExtendedRequest = require('../../lib/index').ExtendedRequest;
  dn = require('../../lib/index').dn;
  t.ok(ExtendedRequest);
  t.ok(dn);
  t.end();
});

test('new no args', (t) => {
  t.ok(new ExtendedRequest());
  t.end();
});

test('new with args', (t) => {
  const req = new ExtendedRequest({
    requestName: '1.2.3.4',
    requestValue: 'test'
  });
  t.ok(req);
  t.equal(req.requestName, '1.2.3.4');
  t.equal(req.requestValue, 'test');
  t.end();
});

test('parse', (t) => {
  const ber = new BerWriter();
  ber.writeString('1.2.3.4', 0x80);
  ber.writeString('test', 0x81);

  const req = new ExtendedRequest();
  t.ok(req._parse(new BerReader(ber.buffer)));
  t.equal(req.requestName, '1.2.3.4');
  t.equal(req.requestValue, 'test');
  t.end();
});

test('toBer', (t) => {
  const req = new ExtendedRequest({
    messageID: 123,
    requestName: '1.2.3.4',
    requestValue: 'test'
  });

  t.ok(req);

  const ber = new BerReader(req.toBer());
  t.ok(ber);
  t.equal(ber.readSequence(), 0x30);
  t.equal(ber.readInt(), 123);
  t.equal(ber.readSequence(), 0x77);
  t.equal(ber.readString(0x80), '1.2.3.4');
  t.equal(ber.readString(0x81), 'test');

  t.end();
});
