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
        {/* Barra Superior */}
        <div className="bg-white border-b">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center">
              <Link href="/books" className="flex items-center text-gray-600 hover:text-gray-900">
                <FiChevronLeft className="mr-2" size={20} />
                <span>Voltar</span>
              </Link>
            </div>
            <div className="flex items-center">
              {user?.email && (
                <span className="text-sm text-gray-600 mr-4">
                  {user.email}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Conteúdo */}
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
} 