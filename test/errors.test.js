// Copyright 2015 Joyent, Inc.
'use strict';

const test = require('tape').test;

const ldap = require('../lib/index');

///--- Tests

test('basic error', function (t) {
  const msg = 'mymsg';
  const err = new ldap.LDAPError(msg, null, null);
  t.ok(err);
  t.equal(err.name, 'LDAPError');
  t.equal(err.code, ldap.LDAP_OTHER);
  t.equal(err.dn, '');
  t.equal(err.message, msg);
  t.end();
});

test('"custom" errors', function (t) {
  const errors = [
    {
      name: 'ConnectionError',
      func: ldap.ConnectionError
    },
    {
      name: 'AbandonedError',
      func: ldap.AbandonedError
    },
    {
      name: 'TimeoutError',
      func: ldap.TimeoutError
    }
  ];

  errors.forEach(function (entry) {
    const msg = entry.name + 'msg';
    const err = new entry.func(msg);
    t.ok(err);
    t.equal(err.name, entry.name);
    t.equal(err.code, ldap.LDAP_OTHER);
    t.equal(err.dn, '');
    t.equal(err.message, msg);
  });

  t.end();
});
