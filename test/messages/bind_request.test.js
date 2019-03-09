// Copyright 2011 Mark Cavage, Inc.  All rights reserved.
'use strict';

const test = require('tape').test;

const asn1 = require('asn1');

////////////////////
// Globals

const BerReader = asn1.BerReader;
const BerWriter = asn1.BerWriter;
let BindRequest;
let dn;

////////////////////
// Tests

test('load library', (t) => {
  BindRequest = require('../../lib/index').BindRequest;
  dn = require('../../lib/index').dn;
  t.ok(BindRequest);
  t.ok(dn);
  t.end();
});

test('new no args', (t) => {
  t.ok(new BindRequest());
  t.end();
});

test('new with args', (t) => {
  const req = new BindRequest({
    version: 3,
    name: dn.parse('cn=root'),
    credentials: 'secret'
  });
  t.ok(req);
  t.equal(req.version, 3);
  t.equal(req.name.toString(), 'cn=root');
  t.equal(req.credentials, 'secret');
  t.end();
});

test('parse', (t) => {
  const ber = new BerWriter();
  ber.writeInt(3);
  ber.writeString('cn=root');
  ber.writeString('secret', 0x80);

  const req = new BindRequest();
  t.ok(req._parse(new BerReader(ber.buffer)));
  t.equal(req.version, 3);
  t.equal(req.dn.toString(), 'cn=root');
  t.equal(req.credentials, 'secret');
  t.end();
});

test('toBer', (t) => {
  const req = new BindRequest({
    messageID: 123,
    version: 3,
    name: dn.parse('cn=root'),
    credentials: 'secret'
  });
  t.ok(req);

  const ber = new BerReader(req.toBer());
  t.ok(ber);
  t.equal(ber.readSequence(), 0x30);
  t.equal(ber.readInt(), 123);
  t.equal(ber.readSequence(), 0x60);
  t.equal(ber.readInt(), 0x03);
  t.equal(ber.readString(), 'cn=root');
  t.equal(ber.readString(0x80), 'secret');

  t.end();
});
