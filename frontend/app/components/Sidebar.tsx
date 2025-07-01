'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface ChatEntry {
  id: number;
  prompt: string;
  response: string;
  timestamp: string;
}

export default function Sidebar({ onSelectChat, selectedChatId }: { onSelectChat?: (id: number) => void, selectedChatId?: number }) {
  const [chats, setChats] = useState<ChatEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const user = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    if (!user) {
      router.push('/login');
      return;
    }
    const { user_id } = JSON.parse(user);
    const fetchChats = async () => {
      setLoading(true);
      setError(null);
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
        const res = await fetch(`${backendUrl}/chat_history?user_id=${user_id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to fetch chat history');
        setChats(data.chats);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch chat history');
      } finally {
        setLoading(false);
      }
    };
    fetchChats();
  }, [router]);

  const handleChatClick = (id: number) => {
    if (onSelectChat) {
      onSelectChat(id);
    } else {
      router.push(`/chat/${id}`);
    }
  };

  return (
    <aside className="w-72 bg-gray-50 border-r border-gray-200 h-screen p-4 flex flex-col">
      <h2 className="text-lg font-bold mb-4">Chat History</h2>
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-600">{error}</div>}
      <ul className="flex-1 overflow-y-auto">
        {chats.map(chat => (
          <li
            key={chat.id}
            className={`p-3 rounded cursor-pointer mb-2 ${selectedChatId === chat.id ? 'bg-indigo-100' : 'hover:bg-gray-200'}`}
            onClick={() => handleChatClick(chat.id)}
            title={chat.prompt}
          >
            <div className="truncate font-medium">{chat.prompt.slice(0, 40) || 'Untitled'}</div>
            <div className="text-xs text-gray-500">{new Date(chat.timestamp).toLocaleString()}</div>
          </li>
        ))}
      </ul>
    </aside>
  );
} 