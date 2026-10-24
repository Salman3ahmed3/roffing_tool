import { describe, expect, it } from 'vitest';
import { findPlaceholders } from '../scripts/placeholders.mjs';

describe('placeholder guard', () => {
  it('finds bracket placeholders in page text', () => {
    expect(findPlaceholders('<p>Last reviewed [Review date] by [Reviewer name].</p>')).toEqual(['[Review date]', '[Reviewer name]']);
    expect(findPlaceholders('<p>Effective [Effective date].</p>')).toEqual(['[Effective date]']);
    expect(findPlaceholders('<p><i>[Have this policy reviewed by a qualified professional before launch.]</i></p>')).toHaveLength(1);
  });
  it('finds placeholders inside JSON-LD', () => {
    const html = '<script type="application/ld+json">{"author":{"@type":"Person","name":"[Author name]"}}</script>';
    expect(findPlaceholders(html)).toEqual(['[Author name]']);
  });
  it('ignores markdown links, code, styles and lowercase or numeric brackets', () => {
    const html = [
      '<p>See [the guide](/guides/x/) for details.</p>',
      '<script>const a = x[Idx]; document.querySelector("[Data]");</script>',
      '<style>.a[Hidden] { display: none }</style>',
      '<p>items[0] and [hidden] attribute, plus [ ] boxes</p>',
    ].join('');
    expect(findPlaceholders(html)).toEqual([]);
  });
  it('passes clean content', () => {
    expect(findPlaceholders('<p>Written by Salman Ahmed · Published 23 October 2026</p>')).toEqual([]);
  });
});
