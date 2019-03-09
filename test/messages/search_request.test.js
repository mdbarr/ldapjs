// Copyright 2011 Mark Cavage, Inc.  All rights reserved.
'use strict';

const test = require('tape').test;

const asn1 = require('asn1');

////////////////////
// Globals

const BerReader = asn1.BerReader;
const BerWriter = asn1.BerWriter;
let SearchRequest;
let EqualityFilter;
let dn;

////////////////////
// Tests

test('load library', (t) => {
  SearchRequest = require('../../lib/index').SearchRequest;
  EqualityFilter = require('../../lib/index').EqualityFilter;
  dn = require('../../lib/index').dn;
  t.ok(SearchRequest);
  t.ok(EqualityFilter);
  t.ok(dn);
  t.end();
});

test('new no args', (t) => {
  t.ok(new SearchRequest());
  t.end();
});

test('new with args', (t) => {
  const req = new SearchRequest({
    baseObject: dn.parse('cn=foo, o=test'),
    filter: new EqualityFilter({
      attribute: 'email',
      value: 'foo@bar.com'
    }),
    attributes: [ 'cn', 'sn' ]
  });
  t.ok(req);
  t.equal(req.dn.toString(), 'cn=foo, o=test');
  t.equal(req.filter.toString(), '(email=foo@bar.com)');
  t.equal(req.attributes.length, 2);
  t.equal(req.attributes[0], 'cn');
  t.equal(req.attributes[1], 'sn');
  t.end();
});

test('parse', (t) => {
  const f = new EqualityFilter({
    attribute: 'email',
    value: 'foo@bar.com'
  });

  let ber = new BerWriter();
  ber.writeString('cn=foo, o=test');
  ber.writeEnumeration(0);
  ber.writeEnumeration(0);
  ber.writeInt(1);
  ber.writeInt(2);
  ber.writeBoolean(false);
  ber = f.toBer(ber);

  const req = new SearchRequest();
  t.ok(req._parse(new BerReader(ber.buffer)));
  t.equal(req.dn.toString(), 'cn=foo, o=test');
  t.equal(req.scope, 'base');
  t.equal(req.derefAliases, 0);
  t.equal(req.sizeLimit, 1);
  t.equal(req.timeLimit, 2);
  t.equal(req.typesOnly, false);
  t.equal(req.filter.toString(), '(email=foo@bar.com)');
  t.equal(req.attributes.length, 0);
  t.end();
});

test('toBer', (t) => {
  const req = new SearchRequest({
    messageID: 123,
    baseObject: dn.parse('cn=foo, o=test'),
    scope: 1,
    derefAliases: 2,
    sizeLimit: 10,
    timeLimit: 20,
    typesOnly: true,
    filter: new EqualityFilter({
      attribute: 'email',
      value: 'foo@bar.com'
    }),
    attributes: [ 'cn', 'sn' ]
  });

  t.ok(req);

  const ber = new BerReader(req.toBer());
  t.ok(ber);
  t.equal(ber.readSequence(), 0x30);
  t.equal(ber.readInt(), 123);
  t.equal(ber.readSequence(), 0x63);
  t.equal(ber.readString(), 'cn=foo, o=test');
  t.equal(ber.readEnumeration(), 1);
  t.equal(ber.readEnumeration(), 2);
  t.equal(ber.readInt(), 10);
  t.equal(ber.readInt(), 20);
  t.ok(ber.readBoolean());
  t.equal(ber.readSequence(), 0xa3);
  t.equal(ber.readString(), 'email');
  t.equal(ber.readString(), 'foo@bar.com');
  t.ok(ber.readSequence());
  t.equal(ber.readString(), 'cn');
  t.equal(ber.readString(), 'sn');

  t.end();
});
