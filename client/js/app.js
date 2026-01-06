/**
 * Story Teller Client Application
 * Secure, modular frontend for AI story generation
 */

// DOM Elements
const elements = {
  statusBadge: document.getElementById('statusBadge'),
  statusText: document.getElementById('statusText'),
  generateBtn: document.getElementById('generateBtn'),
  topicInput: document.getElementById('topic'),
  outputSection: document.getElementById('outputSection'),
  storyContent: document.getElementById('storyContent'),
  loader: document.getElementById('loader'),
  btnText: document.getElementById('btnText'),
  charCount: document.getElementById('charCount'),
  copyBtn: document.getElementById('copyBtn')
};

// Configuration
const CONFIG = {
  API_BASE_URL: window.location.origin,
  MAX_TOPIC_LENGTH: 500,
  REQUEST_TIMEOUT: 60000 // 60 seconds
};

/**
 * Utility Functions
 */
const utils = {
  /**
   * Sanitize text to prevent XSS attacks
   * @param {string} text - Text to sanitize
   * @returns {string} Sanitized text
   */
  sanitizeText(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  /**
   * Show error message to user
   * @param {string} message - Error message
   */
  showError(message) {
    alert(`❌ 오류 발생\n\n${message}`);
  },

  /**
   * Show success message
   * @param {string} message - Success message
   */
  showSuccess(message) {
    alert(`✅ ${message}`);
  },

  /**
   * Validate topic input
   * @param {string} topic - Topic to validate
   * @returns {Object} Validation result
   */
  validateTopic(topic) {
    if (!topic || topic.trim().length === 0) {
      return { valid: false, error: '주제를 입력해주세요.' };
    }

    if (topic.length > CONFIG.MAX_TOPIC_LENGTH) {
      return {
        valid: false,
        error: `주제가 너무 깁니다. (최대 ${CONFIG.MAX_TOPIC_LENGTH}자)`
      };
    }

    return { valid: true };
  }
};

/**
 * API Service
 */
const apiService = {
  /**
   * Check server health
   * @returns {Promise<Object>} Health status
   */
  async checkHealth() {
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/api/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Server health check failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Health check error:', error);
      throw error;
    }
  },

  /**
   * Generate story from topic
   * @param {string} topic - Story topic
   * @returns {Promise<Object>} Generated story
   */
  async generateStory(topic) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT);

      const response = await fetch(`${CONFIG.API_BASE_URL}/api/generate-story`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ topic }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate story');
      }

      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('요청 시간이 초과되었습니다. 다시 시도해주세요.');
      }
      console.error('Story generation error:', error);
      throw error;
    }
  }
};

/**
 * UI Controller
 */
const uiController = {
  /**
   * Update server status badge
   * @param {string} text - Status text
   * @param {boolean} isConnected - Connection status
   */
  updateStatus(text, isConnected) {
    elements.statusText.textContent = text;
    elements.statusBadge.className = 'status-badge ' + (isConnected ? 'connected' : 'error');
  },

  /**
   * Set loading state
   * @param {boolean} isLoading - Loading state
   */
  setLoading(isLoading) {
    elements.generateBtn.disabled = isLoading;

    if (isLoading) {
      elements.loader.classList.add('active');
      elements.btnText.textContent = '이야기 짓는 중...';
    } else {
      elements.loader.classList.remove('active');
      elements.btnText.textContent = '이야기 만들기';
    }
  },

  /**
   * Display generated story
   * @param {string} story - Story text
   */
  displayStory(story) {
    // Use textContent to prevent XSS
    elements.storyContent.textContent = story;
    elements.outputSection.style.display = 'block';

    // Smooth scroll to result
    setTimeout(() => {
      elements.outputSection.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }, 100);
  },

  /**
   * Update character count
   * @param {number} count - Current character count
   */
  updateCharCount(count) {
    elements.charCount.textContent = count;

    if (count > CONFIG.MAX_TOPIC_LENGTH * 0.9) {
      elements.charCount.style.color = 'var(--error-text)';
    } else {
      elements.charCount.style.color = 'var(--text-muted)';
    }
  },

  /**
   * Copy story to clipboard
   */
  async copyToClipboard() {
    try {
      const text = elements.storyContent.textContent;
      await navigator.clipboard.writeText(text);
      utils.showSuccess('이야기가 클립보드에 복사되었습니다!');
    } catch (error) {
      console.error('Copy error:', error);
      utils.showError('복사에 실패했습니다.');
    }
  }
};

/**
 * Event Handlers
 */
const eventHandlers = {
  /**
   * Handle story generation
   */
  async handleGenerate() {
    const topic = elements.topicInput.value.trim();

    // Validate input
    const validation = utils.validateTopic(topic);
    if (!validation.valid) {
      utils.showError(validation.error);
      return;
    }

    // Set loading state
    uiController.setLoading(true);
    elements.outputSection.style.display = 'none';

    try {
      // Generate story
      const result = await apiService.generateStory(topic);

      if (result.success && result.story) {
        uiController.displayStory(result.story);
      } else {
        throw new Error('Invalid response from server');
      }

    } catch (error) {
      utils.showError(error.message);
    } finally {
      uiController.setLoading(false);
    }
  },

  /**
   * Handle topic input change
   */
  handleTopicInput() {
    const length = elements.topicInput.value.length;
    uiController.updateCharCount(length);
  },

  /**
   * Handle copy button click
   */
  handleCopy() {
    uiController.copyToClipboard();
  }
};

/**
 * Initialize Application
 */
async function init() {
  console.log('🚀 Story Teller Client Initializing...');

  // Check server health
  try {
    const health = await apiService.checkHealth();

    if (health.status === 'ok') {
      if (health.apiKeyConfigured) {
        uiController.updateStatus('서버 연결됨', true);
      } else {
        uiController.updateStatus('API Key 미설정', false);
      }
    } else {
      throw new Error('Server not ready');
    }
  } catch (error) {
    console.error('Server connection failed:', error);
    uiController.updateStatus('서버 연결 실패', false);
  }

  // Attach event listeners
  elements.generateBtn.addEventListener('click', eventHandlers.handleGenerate);
  elements.topicInput.addEventListener('input', eventHandlers.handleTopicInput);
  elements.copyBtn.addEventListener('click', eventHandlers.handleCopy);

  // Initialize character count
  uiController.updateCharCount(0);

  console.log('✅ Story Teller Client Ready');
}

// Start application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
