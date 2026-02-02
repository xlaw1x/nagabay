
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, TriageResult } from '../types';

interface ChatInterfaceProps {
  onSendMessage: (message: string) => void;
  messages: ChatMessage[];
  isTyping: boolean;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ onSendMessage, messages, isTyping }) => {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isTyping) {
      onSendMessage(input);
      setInput('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-dark-card rounded-mynaga naga-shadow overflow-hidden border border-slate-100 dark:border-dark-border transition-colors duration-300">
      <div className="p-4 border-b border-slate-50 dark:border-dark-border bg-slate-50/50 dark:bg-dark-bg/50 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-naga-purple flex items-center justify-center text-white shadow-sm">
          <i className="fa-solid fa-robot text-sm"></i>
        </div>
        <div>
          <h2 className="font-bold text-naga-purple dark:text-white text-sm leading-none mb-1">Health Assistant</h2>
          <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Online
          </p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar bg-[#f8f9fe]/50 dark:bg-dark-bg/30">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3.5 rounded-2xl shadow-sm text-sm font-medium leading-relaxed ${
              msg.role === 'user' 
                ? 'bg-naga-purple dark:bg-naga-blue text-white rounded-tr-none' 
                : 'bg-white dark:bg-dark-card text-naga-text dark:text-white rounded-tl-none border border-slate-100 dark:border-dark-border'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-dark-card px-4 py-3 rounded-2xl rounded-tl-none border border-slate-100 dark:border-dark-border flex gap-1 shadow-sm">
              <div className="w-1.5 h-1.5 bg-naga-purple/30 dark:bg-naga-orange/30 rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-naga-purple/30 dark:bg-naga-orange/30 rounded-full animate-bounce [animation-delay:-.15s]"></div>
              <div className="w-1.5 h-1.5 bg-naga-purple/30 dark:bg-naga-orange/30 rounded-full animate-bounce [animation-delay:-.3s]"></div>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-3 bg-white dark:bg-dark-card border-t border-slate-50 dark:border-dark-border flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question..."
          className="flex-1 bg-slate-50 dark:bg-dark-bg rounded-xl px-4 py-2.5 text-sm font-medium dark:text-white focus:outline-none focus:ring-2 focus:ring-naga-purple/10 border border-transparent focus:border-naga-purple/20 transition-all"
        />
        <button
          type="submit"
          disabled={!input.trim() || isTyping}
          className="bg-naga-purple dark:bg-naga-blue text-white w-11 h-11 rounded-xl flex items-center justify-center shadow-md shadow-naga-purple/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
        >
          <i className="fa-solid fa-paper-plane text-xs"></i>
        </button>
      </form>
    </div>
  );
};

export default ChatInterface;
