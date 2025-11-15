import { GoogleGenAI } from "@google/genai";
import { GenerationSettings, PromptPlatform } from '../types';

const buildAIPrompt = (settings: GenerationSettings): string => {
    const {
        marketplace,
        titleLength,
        keywordCount,
        descriptionLength,
        includeDescription,
        includeCategory,
        writingTone,
    } = settings;

    let prompt = `You are an expert AI assistant specializing in generating high-quality, commercially valuable metadata for ${marketplace} images. Your goal is to maximize the image's discoverability and sales potential. Follow these strict rules:\n`;

    // Title
    let titleInstruction = "1) TITLE: Provide ONE concise, descriptive title. ";
    if (titleLength > 0) {
        titleInstruction += `The title should be around ${titleLength} characters. `;
    } else {
        titleInstruction += `The title should be under 200 characters. `;
    }
    titleInstruction += "Use sentence case. No promo words, hashtags, camera models, 'copy space', 'stock photo', or simple 'and' lists. Focus on: Subject + Key Attribute + Context. Example: 'Black briefcase vector icon on dark background'.\n";
    prompt += titleInstruction;

    // Keywords
    let keywordInstruction = "2) KEYWORDS: Provide ";
    if (keywordCount > 0) {
        keywordInstruction += `${keywordCount} `;
    } else {
        keywordInstruction += "25-49 ";
    }
    keywordInstruction += `highly relevant keywords, ordered by importance. Think like a stock photo buyer for ${marketplace}.\n`
    keywordInstruction += "   - **Core & Long-Tail:** Include core subjects (e.g., 'dog') and descriptive long-tail phrases (e.g., 'golden retriever playing fetch in park').\n";
    keywordInstruction += "   - **5 W's:** Cover the 'Who, What, Where, When, Why'. (e.g., Who: 'business team'; What: 'analyzing charts'; Where: 'modern office'; When: 'daytime'; Why: 'collaboration, strategy').\n";
    keywordInstruction += "   - **Conceptual & Use Case:** Add conceptual terms buyers search for (e.g., 'teamwork', 'success', 'innovation', 'data visualization', 'growth'). Think about how the image will be used in marketing, presentations, or articles.\n";
    keywordInstruction += "   - **Strict Rules:** Absolutely NO brand names, people names (unless editorial), generic locations (unless central), duplicates, or stopwords like 'copy space', 'high quality', 'stock photo'. Use comma-separated values.\n";
    prompt += keywordInstruction;
    
    let schemaParts: string[] = ["TITLE: <your title>", "KEYWORDS: <k1, k2, k3, ...>"];
    let nextRule = 3;

    // Category
    if (includeCategory) {
        prompt += `${nextRule}) CATEGORY: Choose exactly one from Adobe's official list based on the primary subject.\n`;
        schemaParts.push("CATEGORY: <one of the 21 official names>");
        nextRule++;
    }

    // Description
    if (includeDescription) {
        let descInstruction = `${nextRule}) DESCRIPTION: Provide a description. `;
        if (descriptionLength > 0) {
            descInstruction += `It should be around ${descriptionLength} characters. `;
        } else {
            descInstruction += `It should be one or two sentences, under 500 characters. `;
        }
        descInstruction += `The tone should be ${writingTone}.\n`;
        prompt += descInstruction;
        schemaParts.push("DESCRIPTION: <your description>");
        nextRule++;
    }

    prompt += `\nReturn using this exact schema:\n${schemaParts.join('\n')}\n`;

    return prompt;
};

const buildImageToPromptAIPrompt = (platform: PromptPlatform): string => {
    let prompt = `You are an expert prompt engineer for text-to-image AI generators. Analyze the provided image in detail. Generate a high-quality, descriptive prompt for the ${platform} model that could recreate a similar image.

Follow these rules:
1.  **Structure:** Start with a concise summary of the main subject and action. Then, add details about composition, style, lighting, colors, and specific artistic techniques.
2.  **Keywords:** Use rich, evocative keywords. For ${platform}, use its specific syntax if applicable (e.g., aspect ratio parameters like '--ar 16:9'). Assume a 16:9 aspect ratio unless the image is clearly portrait or square.
3.  **Style:** Identify the artistic style (e.g., 'photorealistic', 'cinematic', 'impressionistic', '3d render', 'vector illustration').
4.  **Content:** Describe the mood, atmosphere, and any key objects or characters.
5.  **Output:** Return ONLY the generated prompt text. Do not include any headers, titles, or introductory phrases like "Here is your prompt:". The entire response should be the prompt itself.`;

    if (platform === 'Midjourney') {
        prompt += `\nExample structure: [Main subject description], [style details], [composition and framing], [lighting], [color palette], --ar 16:9`
    }
    
    return prompt;
};

const callGeminiAPI = async (base64Image: string, mimeType: string, prompt: string): Promise<string> => {
     const imagePart = {
        inlineData: {
            data: base64Image,
            mimeType: mimeType,
        },
    };
    const textPart = { text: prompt };

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [textPart, imagePart] },
        });
        
        const responseText = response.text;
        if (!responseText || responseText.trim() === '') {
             throw new Error("The AI returned an empty response. This might happen if the image is invalid or flagged by safety filters. Please try a different image.");
        }

        return responseText;

    } catch (error) {
        console.error(`API call failed`, error);
        
        let userFriendlyMessage = "An unexpected error occurred while communicating with the AI service.";

        if (error instanceof Error) {
            const errorMessage = error.message.toLowerCase();
            if (errorMessage.includes("api key not valid")) {
                userFriendlyMessage = "The provided API key is invalid. Please check your environment configuration.";
            } else if (errorMessage.includes("quota")) {
                userFriendlyMessage = "You have exceeded your API quota. Please check your billing and usage limits.";
            } else if (errorMessage.includes("400 bad request") || errorMessage.includes("invalid argument")) {
                userFriendlyMessage = "The request was invalid. This can be caused by an unsupported image format or a corrupted file. Please try a different image.";
            } else if (errorMessage.includes("503") || errorMessage.includes("service unavailable")) {
                userFriendlyMessage = "The AI service is temporarily unavailable. Please wait a few moments and try again.";
            } else {
                 userFriendlyMessage = error.message; 
            }
        }
        throw new Error(userFriendlyMessage);
    }
}

export const generateImageMetadata = async (
    base64Image: string, 
    mimeType: string,
    settings: GenerationSettings
): Promise<string> => {
    const prompt = buildAIPrompt(settings);
    return callGeminiAPI(base64Image, mimeType, prompt);
};

export const generateImagePrompt = async (
    base64Image: string, 
    mimeType: string,
    platform: PromptPlatform
): Promise<string> => {
    const prompt = buildImageToPromptAIPrompt(platform);
    return callGeminiAPI(base64Image, mimeType, prompt);
};
