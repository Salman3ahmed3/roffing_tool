import { describe, expect, it } from 'vitest';
import { breadcrumbLd, faqLd, ldJson, readingMinutes, webAppLd } from '../src/lib/seo';

describe('seo helpers', () => {
  it('breadcrumbs skip crumbs without a page and use absolute URLs', () => {
    const ld = breadcrumbLd('https://x.com', [{ name: 'Home', href: '/' }, { name: 'Roofing' }, { name: 'Tool', href: '/tool/' }], '/tool/');
    expect(ld.itemListElement.map((i) => i.item)).toEqual(['https://x.com/', 'https://x.com/tool/']);
    expect(ld.itemListElement[1].position).toBe(2);
  });
  it('faq and web app', () => {
    expect(faqLd([{ q: 'Q', a: 'A' }]).mainEntity[0].acceptedAnswer.text).toBe('A');
    expect(webAppLd({ site: 'https://x.com', path: '/t/', name: 'T', description: 'd', brand: 'B' }).offers.price).toBe('0');
  });
  it('ldJson escapes < so a value cannot close the script tag', () => {
    expect(ldJson({ a: '</script>' })).not.toContain('</script>');
  });
  it('reading time', () => {
    expect(readingMinutes('word '.repeat(660))).toBe(3);
    expect(readingMinutes('')).toBe(1);
  });
});
