// Copyright 2011 Mark Cavage, Inc.  All rights reserved.
'use strict';

const test = require('tape').test;

const asn1 = require('asn1');

///--- Globals

const BerReader = asn1.BerReader;
const BerWriter = asn1.BerWriter;
let UnbindRequest;

///--- Tests

test('load library', function (t) {
  UnbindRequest = require('../../lib/index').UnbindRequest;
  t.ok(UnbindRequest);
  t.end();
});

test('new no args', function (t) {
  t.ok(new UnbindRequest());
  t.end();
});

test('new with args', function (t) {
  const req = new UnbindRequest({});
  t.ok(req);
  t.end();
});

test('parse', function (t) {
  const ber = new BerWriter();

  const req = new UnbindRequest();
  t.ok(req._parse(new BerReader(ber.buffer)));
  t.end();
});

test('toBer', function (t) {
  const req = new UnbindRequest({
    messageID: 123
  });
  t.ok(req);

  const ber = new BerReader(req.toBer());
  t.ok(ber);
  t.equal(ber.readSequence(), 0x30);
  t.equal(ber.readInt(), 123);
  t.end();
});
