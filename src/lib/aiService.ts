import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";
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
        isScalingEnabled?: boolean;
        targetHydration?: number;
        notes: string;
    } | null;
}

export interface BakerContext {
    recipeName: string;
    ingredients: Ingredient[];
    stages: RecipeStage[];
    hydration: number;
    portions: number;
    notes: string;
    isScalingEnabled: boolean;
}

export interface ChatMessage {
    role: "user" | "assistant";
    content: string;
    image?: {
        data: string;
        mimeType: string;
    };
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
                            stageId: { type: Type.STRING, description: "ID of the stage this ingredient belongs to." },
                            hydration: { type: Type.NUMBER, description: "Starter hydration % (default 100)." },
                            tangzhongRatio: { type: Type.NUMBER, description: "Tangzhong water ratio (default 5 for 1:5)." },
                            waterContent: { type: Type.NUMBER, description: "Liquid percentage for fats/milks." },
                            proteinContent: { type: Type.NUMBER, description: "Flour protein % (e.g. 12.5)." }
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
                isScalingEnabled: {
                    type: Type.BOOLEAN,
                    description: "Whether scaling is active. Set TRUE if requested to scale (double/half/etc)."
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
    required: ["advice"]
};

export async function getBakerAssistantResponse(
    messages: ChatMessage[],
    context: BakerContext
): Promise<BakerResponse> {
    const model = "gemini-3-flash-preview";

    const systemInstruction = `Expert Sourdough Baker Assistant.
    You help bakers update and refine their recipes. You can also analyze photos of bread, crumb structure, or handwritten recipes provided in images.

    RESPONSE FORMAT:
    - 'advice': A friendly, concise message (max 3 sentences).
    - 'recipeUpdate': The COMPLETE recipe state as an OBJECT. Set to null if the user is just asking a question and no recipe changes are needed.
    - You must include 'recipeName', 'ingredients', 'stages', 'portions', and 'notes' every time you return a non-null 'recipeUpdate'.

    STAGES & STRUCTURE:
    - Many recipes have multiple stages (e.g., 'Levain', 'Autolyse', 'Main Dough').
    - Each stage must have a unique 'id' and a 'name'.
    - Each ingredient should have a 'stageId' that matches one of the stage IDs.

    CORE TASKS:
    1. Parsing: For new recipes provided by the user (text or image), extract all details, group them into logical stages, and return the FULL 'recipeUpdate'. Look for protein context (e.g. "12% protein") and hydration details (e.g. "100% hydration starter").
    2. Modification: When swapping/adding/removing ingredients, return the FULL list of ingredients and stages in 'recipeUpdate'.
    3. Scaling: If the user says "double it", set 'portions' to ${context.portions * 2}, set 'isScalingEnabled' to true, and return the FULL recipe update.
    4. Hydration: If the user says "make it 78% hydration", set 'targetHydration' to 78, set 'isScalingEnabled' to true, and return the FULL recipe update.
    5. Photo Analysis: If the user provides an image, analyze it (crumb, crust, recipe) and provide expert feedback or extracted recipe.
    6. General Advice: If user is asking a question or for advice without changing the recipe, set 'recipeUpdate' to null.

    INGREDIENT METADATA:
    - 'proteinContent': Only for Flour.
    - 'hydration': Only for Starter/Leavening. Default sourdough is 100%.
    - 'waterContent': Only for Milk/Butter/Fats. Default Milk is 87, Butter is 16.
    - 'tangzhongRatio': Only for Tangzhong. Default is 5 (for 1:5 ratio).

    STRICT CONSTRAINTS:
    - NEVER return a partial 'recipeUpdate'.
    - DO NOT perform mathematical scaling or hydration calculations yourself.
    - Valid categories: ${Object.values(IngredientCategory).join(", ")}.
    - Be concise, artisanal, and encouraging.`;

    const contents = messages.map((m, idx) => {
        const isLatest = idx === messages.length - 1;
        let text = m.content;

        if (isLatest && m.role === "user") {
            // Append context to the last user message
            const contextStr = JSON.stringify({
                recipeName: context.recipeName,
                ingredients: context.ingredients,
                stages: context.stages,
                portions: context.portions,
                notes: context.notes,
                hydration: context.hydration,
                isScalingEnabled: context.isScalingEnabled
            });
            text = `${m.content}\n\n[LATEST_RECIPE_CONTEXT]\n${contextStr}`;
        }

        const parts: any[] = [{ text }];

        if (m.image) {
            parts.push({
                inlineData: {
                    mimeType: m.image.mimeType,
                    data: m.image.data
                }
            });
        }

        return {
            role: m.role === "user" ? "user" : "model",
            parts
        };
    });

    const response = await getAI().models.generateContent({
        model,
        contents,
        config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: responseSchema as any,
            thinkingConfig: {
                thinkingLevel: ThinkingLevel.MINIMAL
            }
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
