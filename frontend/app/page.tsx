'use client';
// pages/index.js
import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import { useRouter } from 'next/navigation';

interface ChatEntry {
  id: number;
  prompt: string;
  response: string;
  timestamp: string;
}

export default function Home() {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedChat, setSelectedChat] = useState<ChatEntry | null>(null);
  const [user, setUser] = useState<{ user_id: number; username: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    if (!userStr) {
      router.push('/login');
      return;
    }
    setUser(JSON.parse(userStr));
  }, [router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!query.trim() || !user) return;
    setIsLoading(true);
    setError(null);
    setResponse('');
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
      const res = await fetch(`${backendUrl}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: query, user_id: user.user_id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong with the API request.');
      setResponse(data.response);
      setSelectedChat(null); // Refresh sidebar
    } catch (err: any) {
      setError(err.message || 'Failed to get legal advice. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectChat = async (chatId: number) => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
      const res = await fetch(`${backendUrl}/chat_history?user_id=${user.user_id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch chat history');
      const chat = data.chats.find((c: ChatEntry) => c.id === chatId);
      if (chat) {
        setSelectedChat(chat);
        setQuery(chat.prompt);
        setResponse(chat.response);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load chat.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/login');
  };

  return (
    <div className="min-h-screen flex bg-gray-100 font-sans">
      <Sidebar onSelectChat={handleSelectChat} selectedChatId={selectedChat?.id} />
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <header className="w-full flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold text-indigo-700">Legal GPT Advisor</h1>
          {user && (
            <div className="flex items-center gap-4">
              <span className="text-gray-700">{user.username}</span>
              <button onClick={handleLogout} className="text-red-600 hover:underline text-sm">Logout</button>
            </div>
          )}
        </header>
        <main className="bg-white rounded-lg shadow-xl p-8 w-full max-w-2xl">
          <p className="text-center text-gray-600 mb-8">
            Get general legal information and insights. <span className="font-bold text-red-600">Disclaimer: This AI provides general information and is not a substitute for professional legal advice. Consult a qualified lawyer for specific legal matters.</span>
          </p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <textarea
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y min-h-[100px]"
              placeholder="Ask your legal question here..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              rows={5}
            ></textarea>
            <button
              type="submit"
              className="bg-indigo-600 text-white py-3 px-6 rounded-md hover:bg-indigo-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              disabled={isLoading}
            >
              {isLoading ? 'Getting Advice...' : 'Get Legal Advice'}
            </button>
          </form>
          {error && (
            <div className="mt-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
              <p className="font-bold">Error:</p>
              <p>{error}</p>
            </div>
          )}
          {response && (
            <div className="mt-6 p-6 bg-indigo-50 rounded-md border border-indigo-200 shadow-inner">
              <h2 className="text-2xl font-semibold text-indigo-700 mb-3">AI Response:</h2>
              <p className="text-gray-800 whitespace-pre-wrap">{response}</p>
            </div>
          )}
        </main>
        <footer className="mt-8 text-gray-500 text-sm">
          &copy; {new Date().getFullYear()} Legal GPT Advisor. All rights reserved.
        </footer>
      </div>
    </div>
  );
}

// To use Tailwind CSS, ensure you have it set up in your Next.js project.
// If you created your Next.js app with `npx create-next-app --tailwind`, it's already configured.
// Otherwise, follow the Tailwind CSS Next.js installation guide.
// You'll also need to add 'font-sans' to your global CSS or tailwind.config.js for Inter font.
// For example, in `globals.css`:
/*
@tailwind base;
@tailwind components;
@tailwind utilities;

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');

html, body {
  font-family: 'Inter', sans-serif;
}
*/
