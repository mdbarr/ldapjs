// Copyright 2011 Mark Cavage, Inc.  All rights reserved.
'use strict';

const test = require('tape').test;

////////////////////
// Globals

let parseURL;

////////////////////
// Tests

test('load library', (t) => {
  parseURL = require('../lib/index').parseURL;
  t.ok(parseURL);

  t.end();
});

test('parse empty', (t) => {
  const u = parseURL('ldap:///');
  t.equal(u.hostname, 'localhost');
  t.equal(u.port, 389);
  t.ok(!u.DN);
  t.ok(!u.attributes);
  t.equal(u.secure, false);
  t.end();
});

test('parse hostname', (t) => {
  const u = parseURL('ldap://example.com/');
  t.equal(u.hostname, 'example.com');
  t.equal(u.port, 389);
  t.ok(!u.DN);
  t.ok(!u.attributes);
  t.equal(u.secure, false);
  t.end();
});

test('parse host and port', (t) => {
  const u = parseURL('ldap://example.com:1389/');
  t.equal(u.hostname, 'example.com');
  t.equal(u.port, 1389);
  t.ok(!u.DN);
  t.ok(!u.attributes);
  t.equal(u.secure, false);
  t.end();
});

test('parse full', (t) => {
  const u = parseURL('ldaps://ldap.example.com:1389/dc=example%20,dc=com' +
                    '?cn,sn?sub?(cn=Babs%20Jensen)');

  t.equal(u.secure, true);
  t.equal(u.hostname, 'ldap.example.com');
  t.equal(u.port, 1389);
  t.equal(u.DN, 'dc=example ,dc=com');
  t.ok(u.attributes);
  t.equal(u.attributes.length, 2);
  t.equal(u.attributes[0], 'cn');
  t.equal(u.attributes[1], 'sn');
  t.equal(u.scope, 'sub');
  t.equal(u.filter.toString(), '(cn=Babs Jensen)');

  t.end();
});
