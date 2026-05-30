import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

class VisionAIService {
  // Helper function to pause execution (sleep)
  static delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static async analyzeImage(mimeType, base64Data, contextType, retries = 2) {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const imagePart = {
        inlineData: {
          data: base64Data,
          mimeType: mimeType,
        },
      };

      let prompt = '';
      if (contextType === 'food') {
        prompt = `You are a master nutritionist. Analyze this food image and return ONLY a valid, raw JSON object (no markdown, no backticks). Structure: 
        { "foodName": "string", "calories": number, "protein": number, "carbs": number, "fat": number, "isHealthy": boolean, "advice": "One short sentence of dietary advice" }`;
      } else if (contextType === 'finance') {
        prompt = `You are a master accountant. Analyze this receipt/bank screenshot. Return ONLY a valid, raw JSON object (no markdown, no backticks). Structure: 
        { "vendorName": "string", "totalAmount": number, "category": "food|medical|rent|entertainment|other", "type": "expense|income" }`;
      } else if (contextType === 'medical') {
        prompt = `You are a health diagnostic AI. Analyze this medical report or medicine receipt. Return ONLY a valid, raw JSON object (no markdown, no backticks). Structure: 
        { "documentType": "string", "detectedDeficiencies": ["string"], "medications": ["string"], "advice": "One short sentence of medical observation" }`;
      }

      // Send to Gemini
      const result = await model.generateContent([prompt, imagePart]);
      const responseText = result.response.text();

      const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanedText);

    } catch (error) {
      // ✅ NEW: Automatic Retry Logic for 503 Server Overload
      if (error.status === 503 && retries > 0) {
        console.warn(`⚠️ Google Servers busy (503). Retrying in 3 seconds... (${retries} attempts left)`);
        await this.delay(3000); // Wait 3 seconds
        return this.analyzeImage(mimeType, base64Data, contextType, retries - 1);
      }

      console.error('Vision AI Error:', error);
      return null;
    }
  }
}

export default VisionAIService;