import { describe, expect, it } from 'vitest';
import { cleanSignupSource, signUpPath, sourceFromPath } from './signUp';

describe('sign-up source', () => {
  it('adds the page to the sign-up link', () => {
    expect(signUpPath('blog/gas-prices')).toBe('/sign-up?from=blog%2Fgas-prices');
    expect(signUpPath()).toBe('/sign-up');
  });

  it('drops anything that is not a short plain path', () => {
    expect(cleanSignupSource('Tools/Payoff')).toBe('tools/payoff');
    expect(cleanSignupSource('<script>')).toBeUndefined();
    expect(cleanSignupSource('a'.repeat(81))).toBeUndefined();
    expect(signUpPath('https://evil.example')).toBe('/sign-up');
  });

  it('turns a page address into a source', () => {
    expect(sourceFromPath('/')).toBe('home');
    expect(sourceFromPath('/blog/gas-prices')).toBe('blog/gas-prices');
    expect(sourceFromPath('/pricing/')).toBe('pricing');
  });
});
