const envApiKey = import.meta.env.VITE_GEMINI_API_KEY?.trim();

if (!envApiKey) {
  throw new Error("Missing Gemini API key. Set VITE_GEMINI_API_KEY in .env.local.");
}

export const GEMINI_API_KEY = envApiKey;
