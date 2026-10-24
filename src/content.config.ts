import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { SITE } from './config/site';

const guides = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/guides' }),
  schema: z.object({
    title: z.string(),
    /** <title> override; defaults to `title`. */
    seoTitle: z.string().optional(),
    description: z.string().max(170),
    lede: z.string(),
    category: z.string(),
    author: z.string().default(SITE.author),
    authorBio: z.string().optional(),
    /** Only fill these in once a real expert review has happened; nothing shows them yet. */
    reviewer: z.string().optional(),
    reviewerBio: z.string().optional(),
    published: z.coerce.date(),
    updated: z.coerce.date(),
    sources: z.array(z.string()).default([]),
    faqs: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
    /** Related tool path shown at the end. */
    tool: z.string().optional(),
  }),
});

export const collections = { guides };
