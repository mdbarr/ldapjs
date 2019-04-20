// Copyright 2011 Mark Cavage, Inc.  All rights reserved.
'use strict';

////////////////////
// Globals

let parseURL;

////////////////////
// Tests

test('load library', () => {
  parseURL = require('../lib/index').parseURL;
  expect(parseURL).toBeTruthy();
});

test('parse empty', () => {
  const u = parseURL('ldap:///');
  expect(u.hostname).toBe('localhost');
  expect(u.port).toBe(389);
  expect(!u.DN).toBeTruthy();
  expect(!u.attributes).toBeTruthy();
  expect(u.secure).toBe(false);
});

test('parse hostname', () => {
  const u = parseURL('ldap://example.com/');
  expect(u.hostname).toBe('example.com');
  expect(u.port).toBe(389);
  expect(!u.DN).toBeTruthy();
  expect(!u.attributes).toBeTruthy();
  expect(u.secure).toBe(false);
});

test('parse host and port', () => {
  const u = parseURL('ldap://example.com:1389/');
  expect(u.hostname).toBe('example.com');
  expect(u.port).toBe(1389);
  expect(!u.DN).toBeTruthy();
  expect(!u.attributes).toBeTruthy();
  expect(u.secure).toBe(false);
});

test('parse full', () => {
  const u = parseURL('ldaps://ldap.example.com:1389/dc=example%20,dc=com' +
                    '?cn,sn?sub?(cn=Babs%20Jensen)');

  expect(u.secure).toBe(true);
  expect(u.hostname).toBe('ldap.example.com');
  expect(u.port).toBe(1389);
  expect(u.DN).toBe('dc=example ,dc=com');
  expect(u.attributes).toBeTruthy();
  expect(u.attributes.length).toBe(2);
  expect(u.attributes[0]).toBe('cn');
  expect(u.attributes[1]).toBe('sn');
  expect(u.scope).toBe('sub');
  expect(u.filter.toString()).toBe('(cn=Babs Jensen)');
});
