import { VertexAI, GenerativeModel } from '@google-cloud/vertexai';
import { GOOGLE_CLOUD_CONFIG } from './config';

// Initialize Vertex AI client
const vertexAI = new VertexAI({
    project: GOOGLE_CLOUD_CONFIG.projectId,
    location: GOOGLE_CLOUD_CONFIG.region,
});

// Cache models to avoid repeated initialization
const modelCache: Record<string, GenerativeModel> = {};

export const vertex = {
    /**
     * Get a Generative Model instance (e.g., 'gemini-1.5-flash-001')
     */
    getModel(modelName: string = 'gemini-1.5-flash-001'): GenerativeModel {
        if (!modelCache[modelName]) {
            modelCache[modelName] = vertexAI.getGenerativeModel({
                model: modelName,
                // Optional safety settings configs can go here
            });
        }
        return modelCache[modelName];
    },

    /**
     * Generate text from a simple prompt
     */
    async generateText(prompt: string, modelName?: string): Promise<string> {
        try {
            const model = this.getModel(modelName);
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.candidates?.[0].content.parts[0].text;
            return text || '';
        } catch (error) {
            console.error('[VertexAI] Generation failed:', error);
            throw error;
        }
    },

    /**
     * Generate text from a prompt with image (Multimodal)
     */
    async generateFromImage(prompt: string, imageBuffer: Buffer, mimeType: string, modelName?: string): Promise<string> {
        try {
            const model = this.getModel(modelName);
            const textPart = { text: prompt };
            const imagePart = {
                inlineData: {
                    data: imageBuffer.toString('base64'),
                    mimeType: mimeType,
                },
            };

            const result = await model.generateContent({
                contents: [{ role: 'user', parts: [textPart, imagePart] }]
            });
            const response = await result.response;
            return response.candidates?.[0].content.parts[0].text || '';
        } catch (error) {
            console.error('[VertexAI] Multimodal generation failed:', error);
            throw error;
        }
    }
};
