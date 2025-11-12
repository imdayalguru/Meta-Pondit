
import { GoogleGenAI } from "@google/genai";

const buildAIPrompt = (): string => {
    return (
        "You are preparing metadata for Adobe Stock. Follow these strict rules:\n" +
        "1) TITLE: Provide ONE concise, descriptive title (<= 200 characters). Use sentence case. " +
        "   No promo words, no hashtags, no camera model, no 'copy space', no 'stock photo', no 'and' lists. " +
        "   Prefer subject + key attribute + context. Example: 'Black briefcase vector icon on dark background'.\n" +
        "2) KEYWORDS: Provide 25–49 relevant keywords (comma-separated). Order by importance (most important first). " +
        "   Use single words or short 2–3 word phrases. No brand names, no people names (unless clearly editorial), " +
        "   no city or country unless visually central, no duplicates, no stopwords, no fluff like 'copy space' or 'high quality'. " +
        "   Include: subject(s), actions, materials, style (e.g., vector, flat, outline), color aspects if central, " +
        "   and essential conceptual terms buyers would search. Do not add irrelevant topics.\n" +
        "3) CATEGORY: Choose exactly one from Adobe's official list.\n" +
        "4) DESCRIPTION: One or two sentences, <= 500 characters.\n\n" +
        "Return using this exact schema:\n" +
        "TITLE: <your title>\n" +
        "KEYWORDS: <k1, k2, k3, ...>\n" +
        "CATEGORY: <one of the 21 official names>\n" +
        "DESCRIPTION: <your description>\n"
    );
};

export const generateImageMetadata = async (base64Image: string, mimeType: string): Promise<string> => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable is not set.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const imagePart = {
        inlineData: {
            data: base64Image,
            mimeType: mimeType,
        },
    };
    const textPart = { text: buildAIPrompt() };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [textPart, imagePart] },
        });
        return response.text;
    } catch (error) {
        console.error("Error generating metadata:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        throw new Error(`AI generation failed: ${errorMessage}`);
    }
};
