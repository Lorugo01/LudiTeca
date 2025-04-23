import { useRouter } from 'next/router';
import Link from 'next/link';
import { FiChevronLeft } from 'react-icons/fi';
import { useAuth } from '../contexts/auth';

export default function EditorLayout({ children }) {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col">
        {/* Conteúdo */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
} 