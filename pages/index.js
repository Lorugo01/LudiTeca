import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/auth';

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [redirecting, setRedirecting] = useState(false);
  
  console.log("Página inicial renderizada:", { user: !!user, loading, redirecting });
  
  useEffect(() => {
    // Prevenir múltiplos redirecionamentos
    if (redirecting) return;
    
    console.log("useEffect da página inicial:", { user: !!user, loading });
    
    // Apenas redirecionar quando o loading terminar
    if (!loading) {
      setRedirecting(true);
      
      if (user) {
        console.log("Usuário autenticado, redirecionando para /books");
        router.push('/books');
      } else {
        console.log("Usuário não autenticado, redirecionando para /login");
        router.push('/login');
      }
    }
  }, [user, loading, router, redirecting]);
  
  // Segurança: se o loading estiver preso por muito tempo, forçar redirecionamento
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading && !redirecting) {
        console.log("Timer de segurança acionado - redirecionando para /login após timeout");
        setRedirecting(true);
        router.push('/login');
      }
    }, 8000); // 8 segundos de timeout
    
    return () => clearTimeout(timer);
  }, [loading, redirecting, router]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="text-2xl font-bold text-blue-600 mb-4">UniverseTeca CMS</div>
        {loading ? (
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <div className="text-lg text-gray-600">Verificando autenticação...</div>
          </div>
        ) : (
          <div className="text-lg text-gray-600">Redirecionando...</div>
        )}
      </div>
    </div>
  );
} 