'use server';

/**
 * @fileOverview A flow to summarize articles using an LLM.
 *
 * - summarizeArticle - A function that handles the summarization process.
 * - SummarizeArticleInput - The input type for the summarizeArticle function.
 * - SummarizeArticleOutput - The return type for the summarizeArticle function.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'zod';

const SummarizeArticleInputSchema = z.object({
  title: z.string().describe('The title of the article.'),
  link: z.string().describe('The link to the article.'),
  content: z.string().describe('The content of the article to summarize.'),
});
export type SummarizeArticleInput = z.infer<typeof SummarizeArticleInputSchema>;

const SummarizeArticleOutputSchema = z.object({
  summary: z.string().describe('A short summary of the article.'),
});
export type SummarizeArticleOutput = z.infer<typeof SummarizeArticleOutputSchema>;

export async function summarizeArticle(input: SummarizeArticleInput): Promise<SummarizeArticleOutput> {
  return summarizeArticleFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeArticlePrompt',
  input: {
    schema: z.object({
      title: z.string().describe('The title of the article.'),
      content: z.string().describe('The content of the article to summarize.'),
    }),
  },
  output: {
    schema: z.object({
      summary: z.string().describe('A short summary of the article.'),
    }),
  },
  prompt: `Summarize the following article content in a concise manner.
Title: {{{title}}}
Content: {{{content}}}`,
});

const summarizeArticleFlow = ai.defineFlow<
  typeof SummarizeArticleInputSchema,
  typeof SummarizeArticleOutputSchema
>(
  {
    name: 'summarizeArticleFlow',
    inputSchema: SummarizeArticleInputSchema,
    outputSchema: SummarizeArticleOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return output!;
  }
);

