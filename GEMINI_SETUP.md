# Google Gemini Integration Setup Guide

## Environment Configuration

Add your Gemini API key to your `.env` file:

```bash
# Google Gemini Configuration
GEMINI_API_KEY=your_gemini_api_key_here
```

**Important:** Never commit your actual API key to version control!

## Getting Your Gemini API Key

1. Go to https://makersuite.google.com/app/apikey
2. Create a Google account or sign in
3. Click "Create API Key"
4. Select your Google Cloud project (or create a new one)
5. Copy the generated API key
6. Add the key to your `.env` file

## Why Gemini?

### ✅ **Advantages over OpenAI**
- **FREE**: Generous free tier with 15 requests per minute
- **No Credit Card Required**: Start using immediately
- **High Quality**: Gemini 1.5 Flash provides excellent results
- **Fast**: Optimized for speed and efficiency
- **Multimodal**: Can handle text, images, and more
- **Large Context Window**: Up to 1M tokens

### 🆚 **Comparison**
| Feature | Gemini 1.5 Flash | OpenAI GPT-3.5 |
|---------|------------------|-----------------|
| Cost | FREE | $0.002/1K tokens |
| Rate Limit | 15 RPM | Varies by plan |
| Context Window | 1M tokens | 16K tokens |
| Setup | No billing required | Credit card required |

## Features Implemented

### 🤖 AI Job Post Generation
- **Gemini 1.5 Flash** powered content generation
- Professional, engaging job post content
- Customizable company information
- Fallback to manual content if AI fails

### 🖼️ AI Image Prompt Generation
- **Detailed image descriptions** for recruitment banners
- Professional visual composition suggestions
- Social media optimized descriptions
- Can be used with external image generation tools

### 📊 Smart Content Enhancement
- AI-powered job description improvement
- Context-aware content generation
- Token usage tracking
- Model version tracking

### 🎯 **New Features with Gemini**
- **Interview Question Generation**: AI-generated questions based on job requirements
- **Resume Analysis**: Automated CV screening against job criteria
- **Enhanced Prompting**: Better context understanding with larger token limits

## API Endpoints

### Generate Job Post
```bash
POST /api/jobs/:id/job-post
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>

{
  "useAI": true,
  "includeImage": true,
  "companyInfo": "TechCorp - Leading software company",
  "content": "Manual content (optional)"
}
```

### Response Format
```json
{
  "success": true,
  "message": "Job post generated successfully using AI",
  "data": {
    "id": "job_id",
    "jobPost": {
      "content": "Generated job post content...",
      "imagePrompt": "Detailed image description...",
      "aiMetadata": {
        "isAiGenerated": true,
        "modelUsed": "gemini-1.5-flash",
        "tokensUsed": 450,
        "generatedAt": "2024-01-15T10:00:00Z"
      }
    }
  }
}
```

## Error Handling

The AI service includes comprehensive error handling:

- **API Key Missing**: Clear error message with setup instructions
- **Quota Exceeded**: Rate limit notification with retry suggestions
- **Network Issues**: Automatic fallback to manual content
- **Invalid API Key**: Configuration guidance

## Cost Management

### 🆓 **Free Tier Benefits**
- **15 requests per minute** - sufficient for most HRMS usage
- **No billing setup required** - start immediately
- **1M token context window** - handle large job descriptions
- **No usage charges** - completely free within limits

### 📊 **Usage Monitoring**
- Token tracking included in responses
- Rate limit headers provided
- Usage statistics available in Google AI Studio

## Testing

Test the AI generation with curl:

```bash
curl -X POST http://localhost:5000/api/jobs/JOB_ID/job-post \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "useAI": true,
    "includeImage": true,
    "companyInfo": "My Company"
  }'
```

## New AI Features

### Interview Question Generation
```javascript
const questions = await aiService.generateInterviewQuestions(
  'Software Developer',
  'Full stack development role...',
  'mid' // experience level
);
```

### Resume Analysis
```javascript
const analysis = await aiService.analyzeResume(
  'Software Developer',
  'Job requirements...',
  'Resume content...'
);
```

## Troubleshooting

### Common Issues

1. **"Gemini API key is not configured"**
   - Check your `.env` file
   - Restart the server after adding the key

2. **"Gemini quota exceeded"**
   - Wait for rate limit reset (1 minute)
   - Consider implementing request queuing

3. **"Invalid Gemini API key"**
   - Verify key is correct in Google AI Studio
   - Ensure no extra spaces or characters

### Production Considerations

1. **API Key Security**: Use environment variables, never hardcode
2. **Rate Limiting**: 15 RPM limit - implement queuing for high traffic
3. **Caching**: Cache generated content to reduce API calls
4. **Monitoring**: Track usage in Google AI Studio
5. **Backup Plan**: Always allow manual content creation

## Models Used

- **Text Generation**: `gemini-1.5-flash` (fast, efficient, free)
- **Image Descriptions**: `gemini-1.5-flash` (detailed visual prompts)
- **Upgradeable**: Easy to switch to Gemini Pro if needed

## Migration from OpenAI

### What Changed
- ✅ Same API interface - no frontend changes needed
- ✅ Better performance with larger context window
- ✅ No billing setup required
- ✅ Additional features (interview questions, resume analysis)
- ⚠️ Image generation replaced with detailed image prompts

### Environment Variables
```bash
# Remove this
# OPENAI_API_KEY=...

# Add this
GEMINI_API_KEY=your_gemini_api_key_here
```

### Dependencies
```bash
# Remove
npm uninstall openai

# Add
npm install @google/generative-ai
```

## Next Steps

1. Get your free Gemini API key from Google AI Studio
2. Add the key to your `.env` file  
3. Install the new dependencies: `npm install`
4. Restart your backend server
5. Test the AI generation in the frontend
6. Explore new features like interview questions and resume analysis

## Advanced Usage

### Custom Prompting
```javascript
// The service supports custom prompts for specialized content
const customResult = await model.generateContent(
  `Your custom prompt here...`
);
```

### Batch Processing
```javascript
// Process multiple jobs efficiently
const results = await Promise.all(
  jobs.map(job => aiService.generateJobPost(job.title, job.description))
);
```

### Integration with External Tools
```javascript
// Use generated image prompts with external services
const imagePrompt = await aiService.generateImagePrompt(title, description);
// Feed to DALL-E, Midjourney, or other image generation services
```
