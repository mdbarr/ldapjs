// Copyright 2015 Joyent, Inc.
'use strict';

const ldap = require('../lib/index');

////////////////////
// Tests

test('basic error', () => {
  const msg = 'mymsg';
  const err = new ldap.LDAPError(msg, null, null);
  expect(err).toBeTruthy();
  expect(err.name).toBe('LDAPError');
  expect(err.code).toBe(ldap.LDAP_OTHER);
  expect(err.dn).toBe('');
  expect(err.message).toBe(msg);
});

test('"custom" errors', () => {
  const errors = [
    {
      name: 'ConnectionError',
      Func: ldap.ConnectionError
    },
    {
      name: 'AbandonedError',
      Func: ldap.AbandonedError
    },
    {
      name: 'TimeoutError',
      Func: ldap.TimeoutError
    }
  ];

  errors.forEach((entry) => {
    const msg = `${ entry.name }msg`;
    const err = new entry.Func(msg);
    expect(err).toBeTruthy();
    expect(err.name).toBe(entry.name);
    expect(err.code).toBe(ldap.LDAP_OTHER);
    expect(err.dn).toBe('');
    expect(err.message).toBe(msg);
  });
});
