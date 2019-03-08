'use strict';

const test = require('tap').test;

const asn1 = require('asn1');

const BerReader = asn1.BerReader;
const BerWriter = asn1.BerWriter;
let getControl;
let PagedResultsControl;

function bufferEqual(t, a, b) {
  t.equal(a.toString('hex'), b.toString('hex'));
}

///--- Tests

test('load library', function (t) {
  PagedResultsControl =
    require('../../lib').PagedResultsControl;
  t.ok(PagedResultsControl);
  getControl = require('../../lib').getControl;
  t.ok(getControl);
  t.end();
});

test('new no args', function (t) {
  t.ok(new PagedResultsControl());
  t.end();
});

test('new with args', function (t) {
  const c = new PagedResultsControl({
    type: '1.2.840.113556.1.4.319',
    criticality: true,
    value: {
      size: 1000,
      cookie: new Buffer([ 1, 2, 3 ])
    }
  });
  t.ok(c);
  t.equal(c.type, '1.2.840.113556.1.4.319');
  t.ok(c.criticality);
  t.equal(c.value.size, 1000);
  bufferEqual(t, c.value.cookie, new Buffer([ 1, 2, 3 ]));

  const writer = new BerWriter();
  c.toBer(writer);
  const reader = new BerReader(writer.buffer);
  const psc = getControl(reader);
  t.ok(psc);
  console.log('psc', psc.value);
  t.equal(psc.type, '1.2.840.113556.1.4.319');
  t.ok(psc.criticality);
  t.equal(psc.value.size, 1000);
  bufferEqual(t, psc.value.cookie, new Buffer([ 1, 2, 3 ]));

  t.end();
});

test('tober', function (t) {
  const psc = new PagedResultsControl({
    type: '1.2.840.113556.1.4.319',
    criticality: true,
    value: {
      size: 20,
      cookie: new Buffer(0)
    }
  });

  const ber = new BerWriter();
  psc.toBer(ber);

  const c = getControl(new BerReader(ber.buffer));
  t.ok(c);
  t.equal(c.type, '1.2.840.113556.1.4.319');
  t.ok(c.criticality);
  t.equal(c.value.size, 20);
  bufferEqual(t, c.value.cookie, new Buffer(0));

  t.end();
});
