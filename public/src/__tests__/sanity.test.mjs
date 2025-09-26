// ESM-friendly Jest smoke test
import { describe, test, expect } from '@jest/globals';

describe('CI sanity', () => {
  test('math and truthiness behave', () => {
    expect(2 + 2).toBe(4);
    expect(Boolean('ethics')).toBe(true);
    expect([...'ethics'].length).toBeGreaterThan(0);
  });

  test('jsdom is available and DOM APIs work', () => {
    const el = document.createElement('div');
    el.id = 'hello';
    el.textContent = 'Modular Ethics';
    document.body.appendChild(el);

    const found = document.getElementById('hello');
    expect(found).not.toBeNull();
    expect(found.textContent).toMatch(/Modular Ethics/);
  });
});
