// Copyright 2011 Mark Cavage, Inc.  All rights reserved.

const test = require('tape').test;

const asn1 = require('asn1');

///--- Globals

const BerReader = asn1.BerReader;
const BerWriter = asn1.BerWriter;
let CompareRequest;
let dn;

///--- Tests

test('load library', function (t) {
  CompareRequest = require('../../lib/index').CompareRequest;
  dn = require('../../lib/index').dn;
  t.ok(CompareRequest);
  t.ok(dn);
  t.end();
});

test('new no args', function (t) {
  t.ok(new CompareRequest());
  t.end();
});

test('new with args', function (t) {
  const req = new CompareRequest({
    entry: dn.parse('cn=foo, o=test'),
    attribute: 'sn',
    value: 'testy'
  });
  t.ok(req);
  t.equal(req.dn.toString(), 'cn=foo, o=test');
  t.equal(req.attribute, 'sn');
  t.equal(req.value, 'testy');
  t.end();
});

test('parse', function (t) {
  const ber = new BerWriter();
  ber.writeString('cn=foo, o=test');

  ber.startSequence();
  ber.writeString('sn');
  ber.writeString('testy');
  ber.endSequence();

  const req = new CompareRequest();
  t.ok(req._parse(new BerReader(ber.buffer)));
  t.equal(req.dn, 'cn=foo, o=test');
  t.equal(req.attribute, 'sn');
  t.equal(req.value, 'testy');
  t.end();
});

test('toBer', function (t) {
  const req = new CompareRequest({
    messageID: 123,
    entry: dn.parse('cn=foo, o=test'),
    attribute: 'sn',
    value: 'testy'
  });

  t.ok(req);

  const ber = new BerReader(req.toBer());
  t.ok(ber);
  t.equal(ber.readSequence(), 0x30);
  t.equal(ber.readInt(), 123);
  t.equal(ber.readSequence(), 0x6e);
  t.equal(ber.readString(), 'cn=foo, o=test');
  t.ok(ber.readSequence());

  t.equal(ber.readString(), 'sn');
  t.equal(ber.readString(), 'testy');

  t.end();
});
