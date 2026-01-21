import { GoogleGenAI } from "@google/genai";
const genAI = new GoogleGenAI({apiKey: "test"});
console.log("genAI keys:", Object.keys(genAI));
if (genAI.models) console.log("models keys:", Object.keys(genAI.models));
