import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GOOGLE_GENAI_API_KEY;
if (!apiKey) {
  throw new Error('GOOGLE_GENAI_API_KEY environment variable is not set');
}

export const genAI = new GoogleGenerativeAI(apiKey);
export const DEFAULT_MODEL = 'gemini-2.0-flash';
