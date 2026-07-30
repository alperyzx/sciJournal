'use server';

/**
 * @fileOverview Summarizes articles using the Google Generative AI SDK.
 *
 * - summarizeArticle - A function that handles the summarization process.
 * - SummarizeArticleInput - The input type for the summarizeArticle function.
 * - SummarizeArticleOutput - The return type for the summarizeArticle function.
 */

import { genAI, DEFAULT_MODEL } from '@/ai/ai-instance';
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

export async function summarizeArticle(
  input: SummarizeArticleInput
): Promise<SummarizeArticleOutput> {
  const model = genAI.getGenerativeModel({ model: DEFAULT_MODEL });

  const prompt = `Summarize the following article content in a concise manner.
Title: ${input.title}
Content: ${input.content}

Respond with only the summary text, no additional formatting.`;

  const result = await model.generateContent(prompt);
  const summary = result.response.text();

  return SummarizeArticleOutputSchema.parse({ summary });
}
