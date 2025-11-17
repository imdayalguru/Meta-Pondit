
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
    let titleInstruction = "1) TITLE: Craft ONE compelling, descriptive, and highly searchable title.\n";
    titleInstruction += "   - **STRUCTURE:** Follow the formula: [Detailed Subject] + [Action/Attribute] + [Setting/Context].\n";
    let lengthConstraint = titleLength > 0 ? `around ${titleLength} characters` : `between 50 and 150 characters`;
    titleInstruction += `   - **LENGTH:** Aim for a natural length, ideally ${lengthConstraint}. The absolute maximum is 200 characters.\n`;
    titleInstruction += "   - **QUALITY & BEST PRACTICES:**\n";
    titleInstruction += "      - **BE SPECIFIC:** Instead of 'Car on road', write 'Red vintage sports car driving on a coastal highway at sunset'.\n";
    titleInstruction += "      - **USE EVOCATIVE LANGUAGE:** Use strong adjectives and verbs. 'Skier gracefully descending a steep mountain' is better than 'Skier going down a mountain'.\n";
    titleInstruction += "      - **NO KEYWORD STUFFING:** The title must be a natural, readable sentence. Do not just list keywords with commas.\n";
    titleInstruction += "      - **FORBIDDEN:** Absolutely no promotional words (e.g., 'sale', 'free'), camera models, hashtags, or technical jargon like 'copy space', 'stock photo', 'nobody'.\n";
    titleInstruction += "   - **FORMAT:** Use sentence case (capitalize only the first word and proper nouns).\n";
    titleInstruction += "   - **GOOD EXAMPLE:** 'Silhouette of a skier descending a snowy mountain with pine trees, vector illustration'.\n";
    titleInstruction += "   - **BAD EXAMPLE:** 'Skier and mountain and tree illustration'.\n";
    prompt += titleInstruction;

    // Keywords
    let keywordInstruction = "2) KEYWORDS: Generate ";
    if (keywordCount > 0) {
        keywordInstruction += `${keywordCount} `;
    } else {
        keywordInstruction += "between 30 and 49 ";
    }
    keywordInstruction += `commercially valuable keywords. You are acting as a world-class Adobe Stock metadata expert. Your primary goal is to generate keywords that lead to sales. Adherence to this brief is mandatory.\n\n`;
    
    keywordInstruction += `   ## Professional Metadata Brief: Keywords\n\n`;

    keywordInstruction += `   **CRITICAL RULE #1: THINK FIRST, WRITE SECOND.** Before generating keywords, mentally analyze the image using this framework to ensure complete coverage:\n`;
    keywordInstruction += `      - **WHO:** Who is the subject? (e.g., 'skier', 'athlete', 'person in winter gear')\n`;
    keywordInstruction += `      - **WHAT:** What are they doing? What objects are present? (e.g., 'skiing downhill', 'holding ski poles', 'pine trees', 'mountains')\n`;
    keywordInstruction += `      - **WHERE:** What is the setting? (e.g., 'snowy mountain', 'alpine forest', 'ski resort')\n`;
    keywordInstruction += `      - **WHY:** What is the concept, mood, or idea? (e.g., 'adventure', 'freedom', 'exercise', 'winter vacation')\n`;
    keywordInstruction += `      - **HOW:** How is the image depicted? What is the style? (e.g., 'vector illustration', 'silhouette', 'minimalist', 'black and white', 'line art')\n\n`;

    keywordInstruction += `   **CRITICAL RULE #2: PERFECT SORTING ORDER.** This is not a suggestion. The first 10-15 keywords drive sales. The order MUST be from most specific to most conceptual. Follow this structure precisely:\n`;
    keywordInstruction += `      1. **Core Subject & Action (Hyper-Specific):** 'downhill skier', 'alpine skiing', 'skiing silhouette'.\n`;
    keywordInstruction += `      2. **Supporting Elements & Setting:** 'snowy mountain peak', 'pine tree forest', 'winter landscape'.\n`;
    keywordInstruction += `      3. **Style, Composition & Attributes:** 'vector illustration', 'black and white graphic', 'minimalist icon', 'stylized design', 'isolated on white', 'line art'.\n`;
    keywordInstruction += `      4. **Concepts, Themes & Use Cases:** 'winter sports', 'adventure', 'recreation', 'extreme sports', 'freedom', 'holiday', 'healthy lifestyle', 'ski resort logo', 'sports team mascot'.\n\n`;

    keywordInstruction += `   **CRITICAL RULE #3: ZERO TOLERANCE FOR ERRORS & LOW-VALUE TERMS.** A single error makes the entire output a failure.\n`;
    keywordInstruction += `      - **NO Misspellings or Fragments:** Check every word. This is the most important instruction. **Examples of failures: 'volcan' (use 'volcano'), 'eart' (use 'earth'), 'characte' (use 'character'), 'masco' (use 'mascot'), 'eruptio' (use 'eruption'), 'smok' (use 'smoke'), 'illustratio' (use 'illustration').**\n`;
    keywordInstruction += `      - **NO Useless Filler:** Never use forbidden jargon ('stock photo', 'image', 'copy space', 'nobody', 'hd', '4k'). Also, strictly avoid overly generic or subjective filler words like 'beautiful', 'background', 'amazing', 'art', 'artwork', 'design', 'graphic', 'element', 'creative', 'colorful' (unless a specific color is the main subject). Focus on concrete, descriptive terms.\n\n`;
    
    keywordInstruction += `   **CRITICAL RULE #4: RICH & STRATEGIC VOCABULARY.**\n`;
    keywordInstruction += `      - **Specificity is King:** Always prefer the most specific term. 'German Shepherd' is better than 'dog'.\n`;
    keywordInstruction += `      - **Include Singular & Plural:** For key subjects, include both forms (e.g., 'mountain', 'mountains', 'pine tree', 'pine trees').\n`;
    keywordInstruction += `      - **Brainstorm Synonyms & Related Concepts:** Go beyond the obvious. For 'mountain', also include 'peak', 'summit', 'ridge', 'alpine'. For 'skiing', consider 'freeride', 'slalom', 'ski tour'.\n`;
    keywordInstruction += `      - **Think Like a Buyer (Use Cases):** Add keywords describing potential uses. Is it for a logo? An icon? A website banner? A travel brochure? (e.g., 'sports logo', 'travel icon', 'winter vacation graphic', 'team emblem').\n`;
    keywordInstruction += `      - **Mix Literal & Conceptual:** Describe what you see (literal: skier, mountain) and what it represents (conceptual: adventure, freedom).\n\n`;
    
    keywordInstruction += `   **CRITICAL RULE #5: FINAL SELF-CORRECTION MANDATE.** This is your final step. Before outputting, you MUST re-read your entire keyword list and fix any and all fragments, partial words, or typos. Do not output a list containing fragments. This check is mandatory and critical to your function.\n\n`;

    keywordInstruction += `   - **Format:** Provide a single line of text. All keywords must be lowercase and separated by commas.\n`;
    prompt += keywordInstruction;
    
    let schemaParts: string[] = ["TITLE: <your title>", "KEYWORDS: <keyword one, keyword two, ...>"];
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
