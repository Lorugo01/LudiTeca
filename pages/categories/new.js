import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { FaArrowLeft, FaImage } from 'react-icons/fa';
import { useAuth } from '../../contexts/auth';
import { createCategory } from '../../lib/categories';
import Layout from '../../components/Layout';
import MediaLibrary from '../../components/editor/MediaLibrary';

export default function NewCategory() {
  const [name, setName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  
  const { user, loading: isLoading } = useAuth();
  const router = useRouter();

  // Verificar autenticação
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [isLoading, user, router]);

  const handleMediaSelected = (file) => {
    console.log('Imagem selecionada da MediaLibrary:', file);
    const imageUrl = file.publicUrl || file.url;
    console.log('URL da imagem definida:', imageUrl);
    setImageUrl(imageUrl);
    setShowMediaLibrary(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validação básica
      if (!name.trim()) {
        throw new Error('O nome da categoria é obrigatório');
      }

      const categoryData = {
        name: name.trim(),
        image_url: imageUrl,
        created_at: new Date().toISOString(),
      };

      console.log('Enviando dados da categoria para criação:', categoryData);
      
      const { data, error } = await createCategory(categoryData);
      
      if (error) {
        console.error('Erro retornado pela função createCategory:', error);
        throw new Error(error.message || 'Erro ao criar a categoria');
      }
      
      toast.success('Categoria criada com sucesso!');
      router.push('/categories');
    } catch (err) {
      console.error('Exceção capturada no handleSubmit:', err);
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  if (isLoading) {
    return (
      <Layout>
        <div className="text-center p-8">Carregando...</div>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <Link href="/categories" className="flex items-center text-blue-600 hover:text-blue-800">
            <FaArrowLeft className="mr-2" />
            Voltar para Categorias
          </Link>
          <h1 className="text-2xl font-bold">Criar Nova Categoria</h1>
        </div>
        
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
              Nome da Categoria*
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Imagem da Categoria
            </label>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setShowMediaLibrary(true)}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline flex items-center"
              >
                <FaImage className="mr-2" />
                Selecionar Imagem
              </button>
              {imageUrl && (
                <div className="text-sm text-green-600">Imagem selecionada</div>
              )}
            </div>
            
            {imageUrl && (
              <div className="mt-4 border rounded p-4">
                <p className="text-sm text-gray-500 mb-2">Prévia:</p>
                <img src={imageUrl} alt="Imagem da categoria" className="max-h-48 object-contain" />
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            <button
              type="submit"
              disabled={loading}
              className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading ? 'Criando...' : 'Criar Categoria'}
            </button>
          </div>
        </form>
        
        {showMediaLibrary && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-4 w-full max-w-4xl h-3/4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">Selecionar Imagem da Categoria</h3>
                <button 
                  onClick={() => setShowMediaLibrary(false)}
                  className="bg-gray-200 rounded-full p-2 hover:bg-gray-300"
                >
                  &times;
                </button>
              </div>
              <div className="h-full overflow-y-auto">
                <MediaLibrary 
                  onSelect={handleMediaSelected} 
                  mediaType="image"
                  onClose={() => setShowMediaLibrary(false)}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

export async function getServerSideProps() {
  return {
    props: {}, // Será preenchido com dados client-side
  };
} 