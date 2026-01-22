import { GoogleGenAI, Type } from "@google/genai";
import { IngredientCategory, type Ingredient, type RecipeStage } from "./types";

function getAI() {
  if (typeof localStorage === 'undefined') return new GoogleGenAI({ apiKey: '' });
  const apiKey = localStorage.getItem('gemini_api_key') || '';

  // Fallback to the env var defined in vite.config.ts if localStorage is empty
  const finalApiKey = apiKey || (process.env.API_KEY as string) || (process.env.GEMINI_API_KEY as string) || "";

  return new GoogleGenAI({ apiKey: finalApiKey });
}

export interface BakerResponse {
    advice?: string;
    recipeUpdate: {
        recipeName: string;
        ingredients: Ingredient[];
        stages: RecipeStage[];
        portions: number;
        targetHydration?: number;
        notes: string;
    } | null;
}

const responseSchema = {
  type: Type.OBJECT,
    description: "Baking Assistant Response",
    properties: {
        advice: {
            type: Type.STRING,
            description: "A friendly, encouraging response to the user. Max 3 sentences."
        },
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
                },
                stageId: { type: Type.STRING, description: "ID of the stage this ingredient belongs to." }
            },
            required: ["name", "weight", "category"]
          }
        },
          stages: {
              type: Type.ARRAY,
              description: "Logical groups like 'Levain' or 'Main Dough'.",
              items: {
                  type: Type.OBJECT,
                  properties: {
                      id: { type: Type.STRING },
                      name: { type: Type.STRING }
                  },
                  required: ["id", "name"]
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
        required: ["recipeName", "ingredients", "stages", "portions", "notes"]
    }
  },
    required: ["recipeUpdate"]
};

export async function getBakerAssistantResponse(
  messages: { role: "user" | "assistant"; content: string }[],
  context: {
    recipeName: string;
    ingredients: Ingredient[];
      stages: RecipeStage[];
    hydration: number;
      portions: number;
      notes: string;
  }
): Promise<BakerResponse> {
    const model = "gemini-3-flash-preview";

  const systemInstruction = `Expert Sourdough Baker Assistant.
    You help bakers update and refine their recipes.

    RESPONSE FORMAT:
    - 'advice': A friendly, concise message (max 3 sentences).
    - 'recipeUpdate': Always return the COMPLETE recipe state as an OBJECT.
    - You must include 'recipeName', 'ingredients', 'stages', 'portions', and 'notes' every time you return a 'recipeUpdate'.

    STAGES & STRUCTURE:
    - Many recipes have multiple stages (e.g., 'Levain', 'Autolyse', 'Main Dough').
    - Each stage must have a unique 'id' and a 'name'.
    - Each ingredient should have a 'stageId' that matches one of the stage IDs.

    CURRENT CONTEXT:
    - Recipe: ${context.recipeName}
    - Hydration: ${context.hydration.toFixed(1)}%
    - Yield: ${context.portions} portion(s)
    - Stages: ${JSON.stringify(context.stages)}
    - Ingredients: ${JSON.stringify(context.ingredients)}
    - Existing Notes: ${context.notes}

    CORE TASKS:
    1. Parsing: For new recipes, extract all details and group them into logical stages.
    2. Modification: When swapping/adding/removing ingredients, return the FULL list of ingredients and stages.
    3. Scaling: If the user says "double it", set 'portions' to ${context.portions * 2} and return the FULL recipe with current context. The system will handle the math.
    4. Hydration: If the user says "make it 78% hydration", set 'targetHydration' to 78 and return the FULL recipe state. The system will handle the math.

    STRICT CONSTRAINTS:
    - NEVER return a partial 'recipeUpdate'.
    - DO NOT perform mathematical scaling or hydration calculations yourself.
    - Valid categories: ${Object.values(IngredientCategory).join(", ")}.
    - Be concise, artisanal, and encouraging.

    EXAMPLES:
    User: "Convert this to a 2-stage recipe with a levain."
    Response: {
      "advice": "That's a great idea! Dividing the recipe into a levain stage will help you better manage your fermentation timing.",
      "recipeUpdate": {
        "recipeName": "${context.recipeName}",
        "stages": [
          { "id": "levain", "name": "Levain" },
          { "id": "main", "name": "Main Dough" }
        ],
        "ingredients": [
          { "name": "Flour", "weight": 100, "category": "flour", "stageId": "levain" },
          { "name": "Water", "weight": 100, "category": "water", "stageId": "levain" },
          { "name": "Starter", "weight": 20, "category": "starter", "stageId": "levain" },
          { "name": "Bread Flour", "weight": 400, "category": "flour", "stageId": "main" },
          { "name": "Water", "weight": 250, "category": "water", "stageId": "main" },
          { "name": "Salt", "weight": 10, "category": "salt", "stageId": "main" }
        ],
        "portions": ${context.portions},
        "notes": "Grouping into stages for better organization..."
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
