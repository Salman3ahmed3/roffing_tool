import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const guides = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/guides' }),
  schema: z.object({
    title: z.string(),
    /** <title> override; defaults to `title`. */
    seoTitle: z.string().optional(),
    description: z.string().max(170),
    lede: z.string(),
    category: z.string(),
    author: z.string().default('[Author name]'),
    authorBio: z.string().default('[Short bio: trade background, years of experience.]'),
    reviewer: z.string().default('[Reviewer name]'),
    reviewerBio: z.string().default('[License type and number, state.]'),
    published: z.coerce.date(),
    updated: z.coerce.date(),
    sources: z.array(z.string()).default([]),
    faqs: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
    /** Related tool path shown at the end. */
    tool: z.string().optional(),
  }),
});

export const collections = { guides };
