import { describe, expect, it } from 'vitest';
import { affiliateNote, MAX_WAITLIST_NOTE } from './waitlist';

describe('affiliate note', () => {
  it('joins the name and where they share', () => {
    expect(affiliateNote(' Sam Lee ', 'YouTube, 60K')).toBe('Sam Lee — YouTube, 60K');
  });

  it('leaves out an empty half', () => {
    expect(affiliateNote('Sam Lee', '  ')).toBe('Sam Lee');
  });

  it('never exceeds what the server keeps', () => {
    const note = affiliateNote('a'.repeat(150), 'b'.repeat(150));
    expect(note.length).toBeLessThanOrEqual(MAX_WAITLIST_NOTE);
    expect(note.endsWith('…')).toBe(true);
  });
});
