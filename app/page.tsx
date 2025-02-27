'use client';
import { useState } from 'react';
import { Brain, Send, Dna, Bot, User, Loader2, Sparkles, FlaskRound } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: userMessage.content
        }),
      });

      const data = await response.json();
      
      if (data.answer) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.answer
        }]);
      } else if (data.error) {
        console.error('Error:', data.error);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.'
        }]);
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-between bg-black text-white">
      <div className="w-full max-w-4xl p-4 flex flex-col h-screen">
        {/* Header */}
        <div className="flex items-center justify-center gap-3 py-8">
          <Brain className="w-8 h-8 text-cyan-400" />
          <h1 className="text-2xl font-bold text-cyan-400">BiohackGPT</h1>
          <Dna className="w-8 h-8 text-cyan-400 animate-pulse" />
        </div>

        {/* Chat Container */}
        <div className="flex-1 bg-gray-900 rounded-lg p-4 mb-4 overflow-y-auto border border-gray-800">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
              <FlaskRound className="w-16 h-16 text-cyan-400" />
              <p className="text-center text-lg">Start your biohacking journey with AI-powered insights</p>
              <div className="flex flex-wrap gap-4 justify-center">
                <div className="flex items-center gap-2 bg-gray-800 rounded-full px-4 py-2">
                  <Sparkles className="w-4 h-4" />
                  <span>Optimize Performance</span>
                </div>
                <div className="flex items-center gap-2 bg-gray-800 rounded-full px-4 py-2">
                  <Brain className="w-4 h-4" />
                  <span>Enhance Cognition</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-slideIn`}
                >
                  <div
                    className={`flex items-start gap-2 max-w-[80%] ${
                      message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                    }`}
                  >
                    <div className={`p-2 rounded-full ${
                      message.role === 'user' ? 'bg-cyan-600' : 'bg-gray-800'
                    }`}>
                      {message.role === 'user' ? (
                        <User className="w-5 h-5" />
                      ) : (
                        <Bot className="w-5 h-5" />
                      )}
                    </div>
                    <div
                      className={`p-3 rounded-lg ${
                        message.role === 'user'
                          ? 'bg-cyan-600 text-white'
                          : 'bg-gray-800 text-gray-100'
                      }`}
                    >
                      {message.content}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {isLoading && (
            <div className="flex items-center justify-center gap-2 text-cyan-400 mt-4">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Analyzing...</span>
            </div>
          )}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about biohacking, supplements, or optimization..."
            className="flex-1 bg-gray-900 text-white placeholder-gray-400 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-600 border border-gray-800"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="bg-cyan-600 text-white px-6 py-3 rounded-lg hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send className="w-5 h-5" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>
    </div>
  );
}