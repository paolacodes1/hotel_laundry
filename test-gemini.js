// Test script to list available Gemini models
const { GoogleGenerativeAI } = require('@google/generative-ai');

const apiKey = 'your_api_key_here';
const genAI = new GoogleGenerativeAI(apiKey);

async function testModel() {
  try {
    console.log('Testing basic Gemini model access...\n');

    // Try gemini-pro (stable, widely available)
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    console.log('Model created successfully!');
    console.log('Trying to generate simple text (not image)...\n');

    const result = await model.generateContent('Hello, respond with just "OK"');
    const response = await result.response;
    const text = response.text();

    console.log('SUCCESS! API is working!');
    console.log('Response:', text);
    console.log('\nThe model gemini-1.5-flash is available and working.');

  } catch (error) {
    console.error('Error:', error.message);
    console.error('\nFull error:', error);
    console.error('\n⚠️  The API key may not have the Generative Language API enabled.');
    console.error('Please enable it at:');
    console.error('https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com');
  }
}

testModel();
