import React, { useState, useRef, useEffect } from 'react';
import { Icons } from './Icons';
import { ChatMessage } from '../types';
import { GoogleGenAI } from "@google/genai";

interface ChatAssistantProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChatAssistant: React.FC<ChatAssistantProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'Hi! I am your Excel expert. Ask me about formulas, VLOOKUP, pivot tables, or how to fix spreadsheet errors.', timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', text: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      if (!process.env.API_KEY) {
        throw new Error("API Key not found");
      }
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const model = ai.models.generateContent;
      
      // Use the proper model as per system instructions
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
            { role: 'user', parts: [{ text: `You are an expert Microsoft Excel and Spreadsheet assistant. Provide concise, helpful answers to user questions about Excel formulas, functions, errors, and formatting. User Question: ${userMsg.text}` }] }
        ]
      });

      const text = response.text || "I couldn't generate a response. Please try again.";

      setMessages(prev => [...prev, { role: 'model', text: text, timestamp: Date.now() }]);

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', text: "I'm having trouble connecting right now. Please check your API key or internet connection.", timestamp: Date.now() }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col z-50 overflow-hidden h-[500px]">
      {/* Header */}
      <div className="bg-brand-600 p-4 flex justify-between items-center text-white">
        <div className="flex items-center space-x-2">
          <Icons.Sparkles className="w-5 h-5" />
          <span className="font-semibold">Excel AI Expert</span>
        </div>
        <button onClick={onClose} className="hover:bg-brand-700 p-1 rounded-full transition-colors">
          <Icons.X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-lg p-3 text-sm ${
              msg.role === 'user' 
                ? 'bg-brand-600 text-white rounded-br-none' 
                : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 rounded-lg p-3 rounded-bl-none shadow-sm flex items-center space-x-2">
               <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce" />
               <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce delay-100" />
               <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce delay-200" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 bg-white border-t border-slate-200">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about VLOOKUP, errors..."
            className="flex-1 border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
          <button 
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="p-2 bg-brand-600 text-white rounded-md hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Icons.Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
