import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import aiService from '../services/ai.service.js';

/**
 * @desc    Ask the AI Assistant a question
 * @route   POST /api/v1/ai/ask
 * @access  Private
 */
export const askAssistant = asyncHandler(async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    throw ApiError.badRequest('Prompt is required');
  }

  try {
    const responseText = await aiService.generateResponse(prompt);

    res.status(200).json(
      ApiResponse.ok({ response: responseText }, 'AI response generated successfully')
    );
  } catch (error) {
    throw ApiError.internal(error.message);
  }
});

let requestCount = 0;
const AI_USAGE_LIMIT = 2; // Set low for demonstration purposes

/**
 * @desc    Get smart replies based on chat context
 * @route   POST /api/v1/ai/smart-replies
 * @access  Private
 */
export const getSmartReplies = asyncHandler(async (req, res) => {
  requestCount++;
  if (requestCount > AI_USAGE_LIMIT) {
    throw ApiError.tooManyRequests('AI Usage Limit Reached. Please purchase Premium to continue using Smart Replies.');
  }

  const { messages } = req.body;
  
  if (!messages || !Array.isArray(messages)) {
    throw ApiError.badRequest('Valid messages array is required for context');
  }

  try {
    const replies = await aiService.generateSmartReplies(messages);
    res.status(200).json(
      ApiResponse.ok({ replies }, 'Smart replies generated successfully')
    );
  } catch (error) {
    throw ApiError.internal(error.message);
  }
});
