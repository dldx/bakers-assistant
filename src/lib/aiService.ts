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
    recipeUpdate: {
        recipeName: string;
        ingredients: Ingredient[];
        portions: number;
        targetHydration?: number;
        notes: string;
    } | null;
}

const responseSchema = {
  type: Type.OBJECT,
    description: "Baking Assistant Response",
    properties: {
    recipeUpdate: {
      type: Type.OBJECT,
          nullable: true,
          description: "Complete structured recipe data. Always return the full state when changes are proposed.",
      properties: {
          recipeName: {
              type: Type.STRING,
              description: "A short, concise name for the recipe."
          },
        ingredients: {
          type: Type.ARRAY,
            description: "The complete list of ingredients.",
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              weight: { type: Type.NUMBER },
                category: {
                    type: Type.STRING,
                    enum: Object.values(IngredientCategory)
                }
            },
            required: ["name", "weight", "category"]
          }
        },
          portions: {
              type: Type.NUMBER,
              description: "The number of loaves/batches."
          },
          targetHydration: {
              type: Type.NUMBER,
              description: "Optional: Only included if asking for a hydration change."
          },
          notes: {
              type: Type.STRING,
              description: "Complete instructions and notes in Markdown."
          }
          },
          required: ["recipeName", "ingredients", "portions", "notes"]
    }
  },
    required: ["recipeUpdate"]
};

export async function getBakerAssistantResponse(
  messages: { role: "user" | "assistant"; content: string }[],
  context: {
    recipeName: string;
    ingredients: Ingredient[];
    hydration: number;
      portions: number;
      notes: string;
  }
): Promise<BakerResponse> {
    const model = "gemini-3-flash-preview";

  const systemInstruction = `Expert Sourdough Baker Assistant.
    You help bakers update and refine their recipes.

    RESPONSE FORMAT:
    - 'recipeUpdate': Always return the COMPLETE recipe state as an OBJECT.
    - You must include 'recipeName', 'ingredients', 'portions', and 'notes' every time you return a 'recipeUpdate'.

    CURRENT CONTEXT:
    - Recipe: ${context.recipeName}
    - Hydration: ${context.hydration.toFixed(1)}%
    - Yield: ${context.portions} portion(s)
    - Ingredients: ${JSON.stringify(context.ingredients)}
    - Existing Notes: ${context.notes}

    CORE TASKS:
    1. Parsing: For new recipes, extract all details.
    2. Modification: When swapping/adding/removing ingredients, return the FULL list of ingredients.
    3. Scaling: If the user says "double it", set 'portions' to ${context.portions * 2} and return the FULL recipe with current context ingredients. The system will handle the math.
    4. Hydration: If the user says "make it 78% hydration", set 'targetHydration' to 78 and return the FULL recipe state. The system will handle the math.

    STRICT CONSTRAINTS:
    - NEVER return a partial 'recipeUpdate'.
    - DO NOT perform mathematical scaling or hydration calculations yourself.
    - Valid categories: ${Object.values(IngredientCategory).join(", ")}.
    - Be concise, artisanal, and encouraging.

    EXAMPLES:
    User: "Double this recipe please."
    Response: {
      "recipeUpdate": {
        "recipeName": "${context.recipeName}",
        "ingredients": ${JSON.stringify(context.ingredients)},
        "portions": ${context.portions * 2},
        "notes": "${context.notes.replace(/\n/g, '\\n')}"
      }
    }

    User: "Change flour to Whole Wheat and make it 75% hydration."
    Response: {
      "recipeUpdate": {
        "recipeName": "${context.recipeName}",
        "ingredients": ${JSON.stringify(context.ingredients.map(i => i.category === 'flour' ? { ...i, name: 'Whole Wheat Flour' } : i))},
        "portions": ${context.portions},
        "targetHydration": 75,
        "notes": "${context.notes.replace(/\n/g, '\\n')}"
      }
    }`;

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
        responseSchema: responseSchema as any,
    },
  });

  // Handle potential structured error returned in the response
  if ((response as any).error) {
    const err = (response as any).error;
    throw new Error(`AI Error ${err.code}: ${err.message} (${err.status})`);
  }

    const text = (response as any).text;
    if (!text) {
    throw new Error("Empty response from AI");
  }

    return JSON.parse(text) as BakerResponse;
}
