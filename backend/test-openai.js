require('dotenv').config();
const OpenAI = require('openai');

console.log('=== OpenAI Test Script ===');
console.log('API Key found:', process.env.OPENAI_API_KEY ? 'YES' : 'NO');
console.log('API Key starts with:', process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(0, 20) + '...' : 'N/A');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function testOpenAI() {
  try {
    console.log('Testing OpenAI connection...');
    
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant."
        },
        {
          role: "user", 
          content: "Say hello in one word"
        }
      ],
      max_tokens: 10,
      temperature: 0.7,
    });

    console.log('✅ SUCCESS! OpenAI response:', completion.choices[0].message.content);
  } catch (error) {
    console.log('❌ ERROR:', error.message);
    console.log('Error details:', error.response?.data || 'No additional details');
  }
}

testOpenAI(); 