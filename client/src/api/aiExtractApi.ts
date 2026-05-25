import axios from 'axios';

export interface ExtractedRecipe {
  title: string;
  ingredients: string[];
  notes?: string;
}

export const aiApi = {
  extractRecipeFromUrl: async (url: string): Promise<ExtractedRecipe> => {
    const form = new FormData();
    form.append('url', url);
    const { data } = await axios.post('/api/ai/extract-recipe', form);
    return data;
  },
  extractRecipeFromFile: async (file: File): Promise<ExtractedRecipe> => {
    const form = new FormData();
    form.append('file', file);
    const { data } = await axios.post('/api/ai/extract-recipe', form);
    return data;
  },
};
