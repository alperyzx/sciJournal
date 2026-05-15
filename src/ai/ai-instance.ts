// Lightweight local stub replacing genkit usage.
// The project did not require genkit in production; this stub provides
// minimal implementations for `definePrompt` and `defineFlow` so existing
// code (e.g. summarize flows) continues to work without the genkit
// dependency. The stub performs a naive summary for prompts.

type PromptFn = (input?: any) => Promise<any>;

export const ai = {
  definePrompt: (_opts: any): PromptFn => {
    return async (input: any = {}) => {
      const content: string = input.content || input.text || '';
      // Naive summarization: take first two sentences or first 400 chars.
      const sentences = content.match(/[^.!?]+[.!?]\s*/g) || [];
      let summary = '';
      if (sentences.length >= 2) summary = (sentences[0] + (sentences[1] || '')).trim();
      else summary = content.slice(0, 400).trim();
      if (summary.length === 0) summary = '';
      return { output: { summary } };
    };
  },

  defineFlow: <I = any, O = any>(_cfg: any, impl: (input: I) => Promise<{ output?: O } | any>) => {
    // return the provided implementation as the flow function
    return (async (input: I) => {
      return impl(input);
    }) as unknown as ((input: I) => Promise<{ output?: O } | any>);
  },
};
