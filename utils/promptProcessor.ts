import { PromptResult } from '../types';

export const processImagePromptResponse = (text: string): PromptResult => {
    const cleanedPrompt = (text || '').trim().replace(/^prompt\s*:\s*/i, '');
    return {
        prompt: cleanedPrompt,
    };
};
