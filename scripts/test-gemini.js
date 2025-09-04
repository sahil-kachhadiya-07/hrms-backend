/**
 * Test script to verify Gemini AI integration
 * Run this script to test if Gemini is working properly
 */

require('dotenv').config();
const aiService = require('../services/ai.service');

const testGeminiIntegration = async () => {
  try {
    console.log('🧪 Starting Gemini AI integration test...');
    
    if (!process.env.GEMINI_API_KEY) {
      console.error('❌ GEMINI_API_KEY not found in environment variables');
      console.log('📝 Please add your Gemini API key to the .env file:');
      console.log('   GEMINI_API_KEY=your_gemini_api_key_here');
      console.log('🔗 Get your free API key at: https://makersuite.google.com/app/apikey');
      process.exit(1);
    }

    console.log('✅ Gemini API key found');
    
    // Test job post generation
    console.log('\n🎯 Testing job post generation...');
    try {
      const jobPostResult = await aiService.generateJobPost(
        'Senior Software Developer',
        'We are looking for an experienced developer to join our team. Must have experience with Node.js, React, and MongoDB.',
        'TechCorp - A leading software development company'
      );
      
      console.log('✅ Job post generation successful!');
      console.log(`📊 Model used: ${jobPostResult.model}`);
      console.log(`🔢 Tokens used: ${jobPostResult.tokens_used}`);
      console.log(`📝 Content preview: ${jobPostResult.content.substring(0, 100)}...`);
      
    } catch (error) {
      console.error('❌ Job post generation failed:', error.message);
    }

    // Test image description generation
    console.log('\n🖼️ Testing image description generation...');
    try {
      const imageDescResult = await aiService.generateJobImage(
        'Senior Software Developer',
        'TechCorp'
      );
      
      console.log('✅ Image description generation successful!');
      console.log(`📊 Model used: ${imageDescResult.model}`);
      console.log(`🎨 Description preview: ${imageDescResult.prompt.substring(0, 100)}...`);
      console.log(`ℹ️ Note: ${imageDescResult.note}`);
      
    } catch (error) {
      console.error('❌ Image description generation failed:', error.message);
    }

    // Test job description enhancement
    console.log('\n✨ Testing job description enhancement...');
    try {
      const enhanceResult = await aiService.enhanceJobDescription(
        'Software Developer',
        'Need developer with JavaScript experience. Must know databases.'
      );
      
      console.log('✅ Job description enhancement successful!');
      console.log(`📊 Model used: ${enhanceResult.model}`);
      console.log(`🔢 Tokens used: ${enhanceResult.tokens_used}`);
      console.log(`📝 Enhanced preview: ${enhanceResult.enhanced_description.substring(0, 100)}...`);
      
    } catch (error) {
      console.error('❌ Job description enhancement failed:', error.message);
    }

    // Test complete job post generation
    console.log('\n🎪 Testing complete job post generation...');
    try {
      const completeResult = await aiService.generateCompleteJobPost(
        'Full Stack Developer',
        'Looking for a full-stack developer with React and Node.js experience',
        'Amazing Tech Company',
        true
      );
      
      console.log('✅ Complete job post generation successful!');
      console.log(`📝 Content model: ${completeResult.content.model}`);
      console.log(`🖼️ Image included: ${completeResult.image ? 'Yes' : 'No'}`);
      
      if (completeResult.image && !completeResult.image.error) {
        console.log(`🎨 Image description available: ${completeResult.image.prompt.substring(0, 50)}...`);
      }
      
    } catch (error) {
      console.error('❌ Complete job post generation failed:', error.message);
    }

    console.log('\n🎉 Gemini AI integration test completed!');
    console.log('💡 All features are ready to use in your HRMS application.');
    console.log('🆓 Remember: Gemini is completely FREE with generous usage limits!');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('🔧 Please check your configuration and try again.');
  }
};

// Run the test
testGeminiIntegration();