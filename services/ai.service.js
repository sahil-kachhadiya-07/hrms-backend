const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini client
let genAI;
try {
  if (process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
} catch (error) {
  console.warn('Gemini initialization failed:', error.message);
}

const aiService = {
  // Generate job post content using Gemini
  generateJobPost: async (jobTitle, jobDescription, companyInfo = '') => {
    try {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error('Gemini API key is not configured');
      }

      if (!genAI) {
        genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      }

      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const prompt = `Create an engaging and professional job posting for the following position:

Job Title: ${jobTitle}
Job Description: ${jobDescription}
${companyInfo ? `Company Information: ${companyInfo}` : ''}

Please create a compelling job post that includes:
1. An attractive headline
2. Key responsibilities and requirements
3. What makes this role exciting
4. Company culture highlights (if applicable)
5. Call to action for applicants

The tone should be professional yet engaging, designed to attract top talent. Keep it concise but comprehensive (around 300-500 words).

Format the response as a clean, well-structured job posting ready for publishing on job boards and social media platforms.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return {
        content: text.trim(),
        model: "gemini-1.5-flash",
        tokens_used: response.usageMetadata?.totalTokenCount || 0
      };
    } catch (error) {
      console.error('AI Job Post Generation Error:', error);
      
      // Handle specific Gemini errors
      if (error.message.includes('API_KEY_INVALID')) {
        throw new Error('Invalid Gemini API key. Please check your configuration.');
      } else if (error.message.includes('QUOTA_EXCEEDED')) {
        throw new Error('Gemini quota exceeded. Please check your usage limits.');
      } else if (error.message.includes('API key not valid')) {
        throw new Error('Gemini API key is not configured properly');
      }
      
      throw new Error('Failed to generate job post using AI');
    }
  },

  // Generate image description (Gemini doesn't generate images, but can create detailed descriptions)
  generateJobImage: async (jobTitle, companyName = 'Our Company') => {
    try {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error('Gemini API key is not configured');
      }

      if (!genAI) {
        genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      }

      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const prompt = `Create a detailed image description for a professional recruitment banner for this job:

Job Title: ${jobTitle}
Company: ${companyName}

Create a vivid, professional description for an image that would be perfect for social media recruitment posts. Include:
1. Visual composition and layout
2. Colors and styling that would appeal to potential candidates
3. Professional elements that represent the role
4. Text overlay suggestions
5. Overall mood and atmosphere

The description should be detailed enough for someone to create or commission the image.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return {
        image_url: null, // Gemini doesn't generate actual images
        prompt: text.trim(),
        model: "gemini-1.5-flash",
        note: "Image generation not available with Gemini - this is a detailed description for creating the image"
      };
    } catch (error) {
      console.error('AI Image Description Generation Error:', error);
      
      // Handle specific Gemini errors
      if (error.message.includes('API_KEY_INVALID')) {
        throw new Error('Invalid Gemini API key. Please check your configuration.');
      } else if (error.message.includes('QUOTA_EXCEEDED')) {
        throw new Error('Gemini quota exceeded. Please check your usage limits.');
      } else if (error.message.includes('API key not valid')) {
        throw new Error('Gemini API key is not configured properly');
      }
      
      throw new Error('Failed to generate image description using AI');
    }
  },

  // Generate complete job post with content and image description
  generateCompleteJobPost: async (jobTitle, jobDescription, companyInfo = '', includeImage = true) => {
    try {
      const results = {};
      
      // Generate job post content
      const contentResult = await aiService.generateJobPost(jobTitle, jobDescription, companyInfo);
      results.content = contentResult;
      
      // Generate image description if requested
      if (includeImage) {
        try {
          const imageResult = await aiService.generateJobImage(jobTitle, companyInfo || 'Our Company');
          results.image = imageResult;
        } catch (imageError) {
          console.warn('Image description generation failed, continuing without image:', imageError.message);
          results.image = { error: imageError.message };
        }
      }
      
      return results;
    } catch (error) {
      throw error;
    }
  },

  // Enhance existing job description
  enhanceJobDescription: async (jobTitle, originalDescription) => {
    try {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error('Gemini API key is not configured');
      }

      if (!genAI) {
        genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      }

      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const prompt = `Please enhance and improve the following job description for a ${jobTitle} position:

Original Description: ${originalDescription}

Please:
1. Make it more engaging and compelling
2. Improve clarity and structure
3. Add relevant skills and qualifications if missing
4. Ensure it follows best practices for job descriptions
5. Keep the core requirements but make them more appealing

Return only the enhanced job description, ready to use.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return {
        enhanced_description: text.trim(),
        model: "gemini-1.5-flash",
        tokens_used: response.usageMetadata?.totalTokenCount || 0
      };
    } catch (error) {
      console.error('AI Description Enhancement Error:', error);
      
      // Handle specific Gemini errors
      if (error.message.includes('API_KEY_INVALID')) {
        throw new Error('Invalid Gemini API key. Please check your configuration.');
      } else if (error.message.includes('QUOTA_EXCEEDED')) {
        throw new Error('Gemini quota exceeded. Please check your usage limits.');
      } else if (error.message.includes('API key not valid')) {
        throw new Error('Gemini API key is not configured properly');
      }
      
      throw new Error('Failed to enhance job description');
    }
  }
};

module.exports = aiService;