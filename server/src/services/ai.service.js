import { GoogleGenAI } from '@google/genai';
import env from '../config/env.js';
import logger from '../utils/logger.js';

class AiService {
  constructor() {
    this.ai = null;
    if (env.GEMINI_API_KEY && env.GEMINI_API_KEY !== 'your_gemini_api_key_here') {
      try {
        this.ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
      } catch (e) {
        logger.error('Failed to init Gemini API');
      }
    } else {
      logger.warn('GEMINI_API_KEY is not set or invalid. AI features will use fallback.');
    }
  }

  /**
   * Generates a response from the AI assistant based on the prompt.
   * @param {string} prompt - The user's message or context.
   * @returns {Promise<string>} The AI's response text.
   */
  async generateResponse(prompt) {
    if (!this.ai) {
      throw new Error('AI Assistant is not configured. Please set GEMINI_API_KEY.');
    }

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      return response.text;
    } catch (error) {
      logger.error('Error generating AI response:', error);
      throw new Error('Failed to generate AI response');
    }
  }

  /**
   * Generates smart replies based on recent chat messages
   * @param {Array} messages - Array of message objects { role: 'user' | 'other', content: '...' }
   * @returns {Promise<Array<string>>} Array of 3 short suggested replies
   */
  async generateSmartReplies(messages) {
    if (!messages || messages.length === 0) {
      return ['Hi!', 'Hello', 'What\'s up?'];
    }

    const lastMessage = messages[messages.length - 1].content;

    if (this.ai) {
      try {
        const prompt = `
You are an AI generating "Smart Replies" for a chat application.
Based on the following recent conversation history, suggest 3 short, natural, and distinct responses the user could reply with.
Keep each reply under 5-6 words.
Return ONLY a valid JSON array of 3 strings. Do not use markdown blocks or include any other text.

Conversation Context:
${messages.map(m => `${m.role === 'user' ? 'Me' : 'Them'}: ${m.content}`).join('\n')}

Example output format:
["Sounds good!", "I can't make it.", "Let me check."]`;

        const response = await this.ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });

        const rawText = response.text().trim();
        let parsedReplies = [];
        try {
          // Attempt to strip out any markdown formatting if the model accidentally included it
          const cleanText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
          parsedReplies = JSON.parse(cleanText);
          if (Array.isArray(parsedReplies) && parsedReplies.length > 0) {
            return parsedReplies.slice(0, 3);
          }
        } catch (parseErr) {
          logger.warn(`AI Response wasn't valid JSON: ${rawText}`);
        }
      } catch (error) {
        logger.error('Error generating Smart Replies with AI:', error);
      }
    }

    // Fallback logic
    const lowerMsg = lastMessage.toLowerCase();
    
    if (lowerMsg.includes('?')) {
      if (lowerMsg.includes('how are')) return ['I am good!', 'Doing well, you?', 'Not bad!'];
      if (lowerMsg.includes('what time')) return ['Maybe later?', 'Let me check.', 'Right now!'];
      return ['Yes!', 'No.', 'I am not sure.'];
    }
    
    if (lowerMsg.includes('hello') || lowerMsg.includes('hi ') || lowerMsg.includes('hey')) {
      return ['Hey there!', 'Hi!', 'Hello! How are you?'];
    }

    if (lowerMsg.includes('thanks') || lowerMsg.includes('thank you')) {
      return ['You\'re welcome!', 'No problem.', 'Anytime!'];
    }

    if (lowerMsg.includes('bye') || lowerMsg.includes('see ya') || lowerMsg.includes('goodnight')) {
      return ['Bye!', 'See you later!', 'Take care!'];
    }

    return ['Okay', 'Sounds good!', 'Got it.'];
  }
}

export default new AiService();
