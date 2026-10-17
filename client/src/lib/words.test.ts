import { describe, expect, it } from 'vitest';
import { listNames } from './words';

describe('listNames', () => {
  it('joins names the way a sentence does', () => {
    expect(listNames([])).toBe('');
    expect(listNames(['Visa'])).toBe('Visa');
    expect(listNames(['Visa', 'Car loan'])).toBe('Visa and Car loan');
    expect(listNames(['Visa', 'Car loan', 'Store card'])).toBe('Visa, Car loan and Store card');
  });
});
