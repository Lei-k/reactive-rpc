'use strict';

const socketioTransport = require('..');
const assert = require('assert').strict;

assert.strictEqual(socketioTransport(), 'Hello from socketioTransport');
console.info('socketioTransport tests passed');
