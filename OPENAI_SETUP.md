# OpenAI Integration Setup Guide

## Environment Configuration

Add your OpenAI API key to your `.env` file:

```bash
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
```

**Important:** Never commit your actual API key to version control!

## Getting Your OpenAI API Key

1. Go to https://platform.openai.com/
2. Create an account or sign in
3. Navigate to API Keys section
4. Generate a new API key
5. Add billing information (required for API usage)
6. Copy the key to your `.env` file

## Features Implemented

### 🤖 AI Job Post Generation
- **GPT-3.5-turbo** powered content generation
- Professional, engaging job post content
- Customizable company information
- Fallback to manual content if AI fails

### 🖼️ AI Image Generation  
- **DALL-E 3** generated job post images
- Professional recruitment banners
- Automatic error handling
- Optional image generation

### 📊 Smart Content Enhancement
- AI-powered job description improvement
- Context-aware content generation
- Token usage tracking
- Model version tracking

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
      "imageUrl": "https://...",
      "aiMetadata": {
        "isAiGenerated": true,
        "modelUsed": "gpt-3.5-turbo",
        "tokensUsed": 450,
        "generatedAt": "2024-01-15T10:00:00Z",
        "imagePrompt": "Professional recruitment banner..."
      }
    }
  }
}
```

## Error Handling

The AI service includes comprehensive error handling:

- **API Key Missing**: Clear error message with setup instructions
- **Quota Exceeded**: Billing notification with actionable steps  
- **Network Issues**: Automatic fallback to manual content
- **Image Generation Failure**: Continues with text-only post

## Cost Management

- **Text Generation**: ~$0.002 per job post (GPT-3.5-turbo)
- **Image Generation**: ~$0.04 per image (DALL-E 3 standard)
- **Token Tracking**: Usage monitoring included
- **Fallback System**: Prevents API failures from blocking functionality

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

## Troubleshooting

### Common Issues

1. **"OpenAI API key is not configured"**
   - Check your `.env` file
   - Restart the server after adding the key

2. **"OpenAI quota exceeded"**
   - Check your OpenAI billing dashboard
   - Add payment method if needed

3. **"Failed to generate job post"**
   - Check internet connection
   - Verify API key is valid
   - System will fallback to manual content

### Production Considerations

1. **API Key Security**: Use environment variables, never hardcode
2. **Rate Limiting**: OpenAI has usage limits, implement queuing if needed
3. **Caching**: Consider caching generated content to reduce costs
4. **Monitoring**: Track token usage and costs
5. **Backup Plan**: Always allow manual content creation

## Models Used

- **Text Generation**: `gpt-3.5-turbo` (cost-effective, fast)
- **Image Generation**: `dall-e-3` (highest quality)
- **Upgradeable**: Easy to switch to GPT-4 if needed

## Next Steps

1. Set up your OpenAI account and API key
2. Add the key to your `.env` file  
3. Restart your backend server
4. Test the AI generation in the frontend
5. Monitor usage and costs in OpenAI dashboard
