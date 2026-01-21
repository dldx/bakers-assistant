import { GoogleGenAI, Type } from "@google/genai";
import { IngredientCategory, type Ingredient } from "./types";

function getAI() {
  if (typeof localStorage === 'undefined') return new GoogleGenAI({ apiKey: '' });
  const apiKey = localStorage.getItem('gemini_api_key') || '';

  // Fallback to the env var defined in vite.config.ts if localStorage is empty
  const finalApiKey = apiKey || (process.env.API_KEY as string) || (process.env.GEMINI_API_KEY as string) || "";

  return new GoogleGenAI({ apiKey: finalApiKey });
}

export interface BakerResponse {
  advice: string;
  recipeUpdate?: {
    recipeName?: string;
    ingredients?: Ingredient[];
    notes?: string;
  };
}

const bakerResponseSchema = {
  type: Type.OBJECT,
  properties: {
    advice: {
      type: Type.STRING,
      description: "The conversational response to the user. Use Markdown for formatting bullet points or emphasis. Always be professional and encouraging."
    },
    recipeUpdate: {
      type: Type.OBJECT,
      description: "Optional structured recipe data if you are proposing changes or parsing a new recipe.",
      properties: {
        recipeName: { type: Type.STRING },
        ingredients: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              weight: { type: Type.NUMBER },
              category: { type: Type.STRING, enum: Object.values(IngredientCategory) }
            },
            required: ["name", "weight", "category"]
          }
        },
        notes: { type: Type.STRING }
      }
    }
  },
  required: ["advice"]
};

export async function getBakerAssistantResponse(
  messages: { role: "user" | "assistant"; content: string }[],
  context: {
    recipeName: string;
    ingredients: Ingredient[];
    hydration: number;
  }
): Promise<BakerResponse> {
  const model = "gemini-2.5-flash-lite";

  const systemInstruction = `Expert Sourdough Baker Assistant.
    You help with recipe analysis, troubleshooting, and parsing.
    Current Recipe: ${context.recipeName}
    Current Hydration: ${context.hydration.toFixed(1)}%
    Current Ingredients: ${JSON.stringify(context.ingredients)}

    TASK:
    1. Provide expert baking advice.
    2. If the user requests any modification (hydration change, ingredient swap, scaling, etc.) or pastes a new recipe:
       - You MUST populate the 'recipeUpdate' field with the FULL set of ingredients.
       - Ensure all weights are numbers.
       - Use only valid categories: ${Object.values(IngredientCategory).join(", ")}.

    If no recipe change is requested, omit 'recipeUpdate'.

    Be concise, artisanal, and encouraging.`;

  const contents = messages.map(m => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.content }]
  }));

  const response = await getAI().models.generateContent({
    model,
    contents,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: bakerResponseSchema as any,
    },
  });

  // Handle potential structured error returned in the response
  if ((response as any).error) {
    const err = (response as any).error;
    throw new Error(`AI Error ${err.code}: ${err.message} (${err.status})`);
  }

  if (!response.text) {
    throw new Error("Empty response from AI");
  }

  return JSON.parse(response.text) as BakerResponse;
}
