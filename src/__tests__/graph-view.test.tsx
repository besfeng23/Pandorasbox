import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GraphView } from '@/components/GraphView';

describe('GraphView component', () => {
  it('exports a component function', () => {
    assert.equal(typeof GraphView, 'function');
  });
});
