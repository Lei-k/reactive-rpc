'use strict';

const socketioClientTransport = require('..');
const assert = require('assert').strict;

assert.strictEqual(socketioClientTransport(), 'Hello from socketioClientTransport');
console.info('socketioClientTransport tests passed');
