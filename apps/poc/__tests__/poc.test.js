'use strict';

const poc = require('..');
const assert = require('assert').strict;

assert.strictEqual(poc(), 'Hello from poc');
console.info('poc tests passed');
