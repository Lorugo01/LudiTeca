import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { FiPlus, FiEdit, FiTrash2 } from 'react-icons/fi';

import { useAuth } from '../../contexts/auth';
import { getCategories, deleteCategory, getFileUrl } from '../../lib/supabase';
import Layout from '../../components/Layout';

export default function Categories() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(null);
  
  // Verificar autenticação
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);
  
  // Carregar categorias do Supabase
  useEffect(() => {
    if (user) {
      fetchCategories();
    }
  }, [user]);
  
  // Improved fetchCategories function with better debugging
  const fetchCategories = async () => {
    try {
      setLoading(true);
      const { data, error } = await getCategories();
      
      if (error) {
        throw error;
      }
      
      console.log('Categorias carregadas (raw data):', data);
      
      // Processar os dados para obter URLs de imagens
      const categoriesWithImages = data.map(category => {
        let imageUrl = null;
        
        // Verificar se existe image_url e não está vazio
        if (category.image_url && category.image_url.trim() !== '') {
          // Se for uma URL completa, usar diretamente
          if (category.image_url.startsWith('http')) {
            imageUrl = category.image_url;
          } else {
            // Caso contrário, obter do bucket 'categories'
            imageUrl = getFileUrl('categories', category.image_url);
          }
        }
        
        console.log(`Categoria "${category.name}" (id: ${category.id}):`, { 
          raw_image_url: category.image_url,
          processed_imageUrl: imageUrl 
        });
        
        return {
          ...category,
          imageUrl
        };
      });
      
      setCategories(categoriesWithImages || []);
    } catch (err) {
      console.error('Erro ao carregar categorias:', err);
      setError('Falha ao carregar as categorias. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };
  
  // Função para excluir uma categoria
  const handleDeleteCategory = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta categoria? Esta ação não pode ser desfeita.')) {
      try {
        setDeleteLoading(id);
        const { error } = await deleteCategory(id);
        
        if (error) {
          throw error;
        }
        
        // Atualizar a lista de categorias
        setCategories(categories.filter(category => category.id !== id));
      } catch (err) {
        console.error('Erro ao excluir categoria:', err);
        alert('Falha ao excluir a categoria. Por favor, tente novamente.');
      } finally {
        setDeleteLoading(null);
      }
    }
  };
  
  // Função para criar uma nova categoria
  const handleCreateCategory = () => {
    router.push('/categories/new');
  };
  
  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Carregando categorias...</div>
        </div>
      </Layout>
    );
  }
  
  return (
    <>
      <Head>
        <title>Gerenciar Categorias | UniverseTeca CMS</title>
      </Head>
      
      <Layout>
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Gerenciar Categorias</h1>
            
            <button
              onClick={handleCreateCategory}
              className="flex items-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              <FiPlus className="mr-2" />
              Nova Categoria
            </button>
          </div>
          
          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
              {error}
            </div>
          )}
          
          {categories.length === 0 ? (
            <div className="bg-gray-100 p-8 rounded-lg text-center">
              <p className="text-lg text-gray-600 mb-4">
                Nenhuma categoria encontrada
              </p>
              <button
                onClick={handleCreateCategory}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Criar primeira categoria
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map(category => (
                <div key={category.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div 
                    className="h-40 flex items-center justify-center"
                    style={{ 
                      backgroundColor: category.color || '#f3f4f6',
                      backgroundImage: category.imageUrl ? `url(${category.imageUrl})` : 'none',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }}
                  >
                    {!category.imageUrl && (
                      <h2 className="text-2xl font-bold text-white text-center">
                        {category.name}
                      </h2>
                    )}
                  </div>
                  
                  <div className="p-4">
                    <h2 className="text-xl font-semibold mb-2 truncate">
                      {category.name}
                    </h2>
                    
                    <div className="flex justify-between">
                      <button
                        onClick={() => router.push(`/categories/${category.id}/edit`)}
                        className="flex items-center px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        <FiEdit className="mr-1" />
                        Editar
                      </button>
                      
                      <button
                        onClick={() => handleDeleteCategory(category.id)}
                        className="flex items-center px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                        disabled={deleteLoading === category.id}
                      >
                        <FiTrash2 className="mr-1" />
                        {deleteLoading === category.id ? 'Excluindo...' : 'Excluir'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Layout>
    </>
  );
} 