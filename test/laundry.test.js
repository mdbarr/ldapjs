// Copyright 2011 Mark Cavage, Inc.  All rights reserved.
'use strict';

const { v4: uuid } = require('uuid');

const ldap = require('../lib/index');

////////////////////
// Globals

const SOCKET = `/tmp/.${ uuid() }`;
const SUFFIX = `dc=${ uuid() }`;

let client;
let server;

////////////////////
// Helper

function search (done, options, callback) {
  client.search(SUFFIX, options, (err, res) => {
    expect(err).toBeFalsy();
    expect(res).toBeTruthy();
    let found = false;
    res.on('searchEntry', (entry) => {
      expect(entry).toBeTruthy();
      found = true;
    });
    res.on('end', () => {
      expect(found).toBeTruthy();
      if (callback) { return callback(); }

      return done();
    });
  });
}

////////////////////
// Tests

test('setup', done => {
  server = ldap.createServer();
  expect(server).toBeTruthy();
  server.listen(SOCKET, () => {
    client = ldap.createClient({ socketPath: SOCKET });
    expect(client).toBeTruthy();
    done();
  });

  server.bind('cn=root', (req, res, next) => {
    res.end();
    return next();
  });

  server.search(SUFFIX, (req, res, next) => {
    const entry = {
      dn: `cn=foo, ${ SUFFIX }`,
      attributes: {
        objectclass: [ 'person', 'top' ],
        cn: 'Pogo Stick',
        sn: 'Stick',
        givenname: 'ogo',
        mail: `${ uuid() }@pogostick.org`,
      },
    };

    if (req.filter.matches(entry.attributes)) {
      res.send(entry);
    }
    res.end();
    return next();
  });
});

test('Evolution search filter (GH-3)', (done) => {
  // This is what Evolution sends, when searching for a contact 'ogo'. Wow.
  const filter =
    '(|(cn=ogo*)(givenname=ogo*)(sn=ogo*)(mail=ogo*)(member=ogo*)' +
    '(primaryphone=ogo*)(telephonenumber=ogo*)(homephone=ogo*)(mobile=ogo*)' +
    '(carphone=ogo*)(facsimiletelephonenumber=ogo*)' +
    '(homefacsimiletelephonenumber=ogo*)(otherphone=ogo*)' +
    '(otherfacsimiletelephonenumber=ogo*)(internationalisdnnumber=ogo*)' +
    '(pager=ogo*)(radio=ogo*)(telex=ogo*)(assistantphone=ogo*)' +
    '(companyphone=ogo*)(callbackphone=ogo*)(tty=ogo*)(o=ogo*)(ou=ogo*)' +
    '(roomnumber=ogo*)(title=ogo*)(businessrole=ogo*)(managername=ogo*)' +
    '(assistantname=ogo*)(postaladdress=ogo*)(l=ogo*)(st=ogo*)' +
    '(postofficebox=ogo*)(postalcode=ogo*)(c=ogo*)(homepostaladdress=ogo*)' +
    '(mozillahomelocalityname=ogo*)(mozillahomestate=ogo*)' +
    '(mozillahomepostalcode=ogo*)(mozillahomecountryname=ogo*)' +
    '(otherpostaladdress=ogo*)(jpegphoto=ogo*)(usercertificate=ogo*)' +
    '(labeleduri=ogo*)(displayname=ogo*)(spousename=ogo*)(note=ogo*)' +
    '(anniversary=ogo*)(birthdate=ogo*)(mailer=ogo*)(fileas=ogo*)' +
    '(category=ogo*)(calcaluri=ogo*)(calfburl=ogo*)(icscalendar=ogo*))';

  return search(done, filter);
});

test('GH-49 Client errors on bad attributes', (done) => {
  const searchOpts = {
    filter: 'cn=*ogo*',
    scope: 'one',
    attributes: 'dn',
  };
  return search(done, searchOpts);
});

test('GH-55 Client emits connect multiple times', done => {
  const c = ldap.createClient({ socketPath: SOCKET });

  let count = 0;
  c.on('connect', (socket) => {
    expect(socket).toBeTruthy();
    count++;
    c.bind('cn=root', 'secret', (err) => {
      expect(err).toBeFalsy();
      c.unbind(() => {
        expect(count).toBe(1);
        done();
      });
    });
  });
});

test('shutdown', done => {
  client.unbind(() => {
    server.on('close', () => {
      done();
    });
    server.close();
  });
});
