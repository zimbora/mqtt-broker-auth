'use strict';

const { strict: assert } = require('assert');
const parser = require('../src/aux/parser');

describe('parser.pathIntoObject', () => {

  it('builds a nested object from a multi-segment path', () => {
    const result = parser.pathIntoObject('a/b/c', 42);
    assert.deepEqual(result, { a: { b: { c: 42 } } });
  });

  it('builds a single-level object from a one-segment path', () => {
    const result = parser.pathIntoObject('key', 'value');
    assert.deepEqual(result, { key: 'value' });
  });

  it('ignores leading and trailing slashes', () => {
    const result = parser.pathIntoObject('/a/b/', true);
    assert.deepEqual(result, { a: { b: true } });
  });

  it('handles data that is an object', () => {
    const data = { x: 1 };
    const result = parser.pathIntoObject('level1/level2', data);
    assert.deepEqual(result, { level1: { level2: { x: 1 } } });
  });

  it('handles data that is null', () => {
    const result = parser.pathIntoObject('a/b', null);
    assert.deepEqual(result, { a: { b: null } });
  });

  it('handles a path with many segments', () => {
    const result = parser.pathIntoObject('a/b/c/d', 'end');
    assert.deepEqual(result, { a: { b: { c: { d: 'end' } } } });
  });
});
