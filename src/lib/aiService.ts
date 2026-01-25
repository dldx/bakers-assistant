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
        recipeName?: string;
        ingredients?: Partial<Ingredient>[];
        removeIngredientIds?: string[];
        stages?: RecipeStage[];
        removeStageIds?: string[];
        portions?: number;
        isScalingEnabled?: boolean;
        targetHydration?: number;
        notes?: string;
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
            description: "Structured recipe adjustments. Only include the fields that need to change to avoid transcription errors.",
            properties: {
                recipeName: {
                    type: Type.STRING,
                    description: "Updated recipe name."
                },
                ingredients: {
                    type: Type.ARRAY,
                    description: "Ingredients to add or update. To update, include the 'id'. To add, omit 'id'.",
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING, description: "Existing ingredient ID to update." },
                            name: { type: Type.STRING },
                            weight: { type: Type.NUMBER },
                            category: {
                                type: Type.STRING,
                                enum: Object.values(IngredientCategory)
                            },
                            stageId: { type: Type.STRING },
                            hydration: { type: Type.NUMBER },
                            tangzhongRatio: { type: Type.NUMBER },
                            waterContent: { type: Type.NUMBER },
                            proteinContent: { type: Type.NUMBER }
                        }
                    }
                },
                removeIngredientIds: {
                    type: Type.ARRAY,
                    description: "List of IDs of ingredients to remove from the recipe.",
                    items: { type: Type.STRING }
                },
                removeStageIds: {
                    type: Type.ARRAY,
                    description: "List of IDs of stages to remove.",
                    items: { type: Type.STRING }
                },
                stages: {
                    type: Type.ARRAY,
                    description: "Logical groups like 'Levain' or 'Main Dough'.",
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING },
                            name: { type: Type.STRING },
                            excludeFromCalculations: {
                                type: Type.BOOLEAN,
                                description: "If true, ingredients in this stage are excluded from baker's math (hydration/total weight)."
                            }
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
                    description: "Whether scaling is active."
                },
                targetHydration: {
                    type: Type.NUMBER,
                    description: "Set this to trigger a hydration recalculation."
                },
                notes: {
                    type: Type.STRING,
                    description: "Updated Markdown notes/instructions."
                }
            }
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
    - 'recipeUpdate': An OBJECT containing ONLY the changes needed. Set to null if no changes are needed.

    STAGES & STRUCTURE:
    - Each stage must have a unique 'id' and a 'name'.
    - Ingredients use 'stageId' to link to a stage.
    - Stages can have 'excludeFromCalculations': set this to true for optional mix-ins, toppings, or soakers that shouldn't affect the main dough's hydration or total weight math.

    CORE TASKS:
    1. Parsing: For new recipes, return the 'recipeUpdate' with all fields.
    2. Modification: To update an ingredient, include its 'id' in the 'ingredients' array. To add one, omit 'id'. To remove one, put its 'id' in 'removeIngredientIds'. Same principle for stages with 'stages' and 'removeStageIds'.
    3. Scaling: Only return the new 'portions' and set 'isScalingEnabled' to true.
    4. Hydration: Only return 'targetHydration' and set 'isScalingEnabled' to true.
    5. General Advice: Set 'recipeUpdate' to null.

    CRITICAL: Only send 'recipeUpdate' fields that are changing. Do not repeat the entire ingredient list unless the user is providing a completely new recipe. This prevents transcription errors.

    INGREDIENT METADATA:
    - 'proteinContent': Only for Flour.
    - 'hydration': Only for Starter/Leavening. Default sourdough is 100%.
    - 'waterContent': Only for Milk/Butter/Fats/Eggs.
      Defaults: Milk (87), Butter (16), Whole Egg (75), Egg White (88), Egg Yolk (50).
    - 'tangzhongRatio': Only for Tangzhong. Default is 5 (for 1:5 ratio).

    STRICT CONSTRAINTS:
    - Return a partial 'recipeUpdate' containing only changed fields.
    - DO NOT perform mathematical scaling or hydration calculations yourself.
    - NUMERIC VALUES: Use whole numbers for weights. Limit all other numeric values (hydration, protein, ratios) to maximum 1 decimal place.
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
