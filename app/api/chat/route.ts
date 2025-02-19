import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    // Add system message for biohacking context
    const conversationMessages = [
      {
        role: "system",
        content: "You are a knowledgeable biohacking assistant. You provide evidence-based advice about optimization, supplements, and cognitive enhancement while maintaining a focus on safety and scientific validity."
      },
      ...messages
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: conversationMessages,
    });

    // Return the complete message object
    return NextResponse.json({
      response: {
        role: 'assistant',
        content: completion.choices[0].message.content
      }
    });
  } catch (error) {
    console.error('OpenAI API error:', error);
    return NextResponse.json({ error: 'Error processing your request' }, { status: 500 });
  }
}