import { afterEach, describe, expect, it } from 'vitest';
import { cleanSignupSource, currentReferral, forgetReferral, referralFromSearch, rememberReferral, signUpPath, sourceFromPath } from './signUp';

describe('sign-up source', () => {
  afterEach(forgetReferral);

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

  it('reads a creator tag from the landing address', () => {
    expect(referralFromSearch('?from=Money-With-Sam&utm=x')).toBe('money-with-sam');
    expect(referralFromSearch('?from=<script>')).toBeUndefined();
    expect(referralFromSearch('')).toBeUndefined();
  });

  it('keeps the tag a visitor arrived with, over the page they click from', () => {
    rememberReferral('?from=money-with-sam');
    expect(currentReferral()).toBe('money-with-sam');
    expect(signUpPath('pricing')).toBe('/sign-up?from=money-with-sam');
    expect(signUpPath()).toBe('/sign-up?from=money-with-sam');
  });

  it('does not forget the tag when a later page has none', () => {
    rememberReferral('?from=money-with-sam');
    rememberReferral('');
    expect(currentReferral()).toBe('money-with-sam');
  });

  it('starts clean when the landing address has no tag', () => {
    rememberReferral('?utm=x');
    expect(currentReferral()).toBeUndefined();
    expect(signUpPath('home')).toBe('/sign-up?from=home');
  });
});
