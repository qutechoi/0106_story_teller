const express = require('express');
const router = express.Router();

// Validate API key exists
const validateApiKey = (req, res, next) => {
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({
      error: 'Configuration Error',
      message: 'OpenAI API key not configured on server'
    });
  }
  next();
};

// Rate limiting helper (simple in-memory implementation)
const requestCounts = new Map();
const RATE_LIMIT = 10; // requests per minute
const RATE_WINDOW = 60 * 1000; // 1 minute

const rateLimiter = (req, res, next) => {
  const ip = req.ip;
  const now = Date.now();

  if (!requestCounts.has(ip)) {
    requestCounts.set(ip, []);
  }

  const requests = requestCounts.get(ip).filter(time => now - time < RATE_WINDOW);

  if (requests.length >= RATE_LIMIT) {
    return res.status(429).json({
      error: 'Rate Limit Exceeded',
      message: 'Too many requests. Please try again later.'
    });
  }

  requests.push(now);
  requestCounts.set(ip, requests);
  next();
};

// POST /api/generate-story
router.post('/generate-story', validateApiKey, rateLimiter, async (req, res) => {
  try {
    const { topic } = req.body;

    // Input validation
    if (!topic || typeof topic !== 'string') {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Topic is required and must be a string'
      });
    }

    if (topic.trim().length === 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Topic cannot be empty'
      });
    }

    if (topic.length > 500) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Topic is too long (max 500 characters)'
      });
    }

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: '당신은 최고의 수필가이자 이야기꾼입니다. 주어진 주제에 대해 아주 현실감 넘치고, 유머러스하며, 몰입도 높은 수필 형식의 이야기를 작성해주세요. 한국어로 작성하세요.'
          },
          {
            role: 'user',
            content: `주제: ${topic}`
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API Error:', errorData);

      return res.status(response.status).json({
        error: 'OpenAI API Error',
        message: errorData.error?.message || 'Failed to generate story'
      });
    }

    const data = await response.json();
    const story = data.choices[0].message.content;

    res.json({
      success: true,
      story: story,
      usage: data.usage
    });

  } catch (error) {
    console.error('Story generation error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to generate story. Please try again.'
    });
  }
});

// GET /api/health - Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    apiKeyConfigured: !!process.env.OPENAI_API_KEY
  });
});

module.exports = router;
