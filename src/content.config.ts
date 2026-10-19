import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Каждый проект — отдельный файл в src/content/projects.
// order — место в списке (1 — первый). featured: true — проект попадает в кольцо и в «Избранные проекты».
const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    tag: z.string(),
    order: z.number(),
    featured: z.boolean().default(false),
    // Временная обложка из плашек, пока нет настоящих: [фон, акцент, блок]
    palette: z.tuple([z.string(), z.string(), z.string()]),
    map: z.boolean().default(false),
  }),
});

export const collections = { projects };
