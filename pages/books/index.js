import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { FiPlus, FiEdit, FiTrash2, FiBook } from 'react-icons/fi';

import { useAuth } from '../../contexts/auth';
import { getBooks, deleteBook } from '../../lib/books';
import { getFileUrl } from '../../lib/supabase';
import Layout from '../../components/Layout';

export default function Books() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(null);
  
  // Verificar autenticação
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);
  
  // Carregar livros do Supabase
  useEffect(() => {
    if (user) {
      fetchBooks();
    }
  }, [user]);
  
  // Função para buscar livros
  const fetchBooks = async () => {
    try {
      setLoading(true);
      const { data, error } = await getBooks();
      
      if (error) {
        throw error;
      }
      
      console.log('Livros carregados:', data);
      
      // Processar os dados para obter URLs de capas
      const booksWithCovers = data.map(book => {
        let coverUrl = null;
        
        // Verificar se existe cover_image
        if (book.cover_image) {
          // Se for uma URL completa, usar diretamente
          if (book.cover_image.startsWith('http')) {
            coverUrl = book.cover_image;
          } else {
            // Caso contrário, obter do bucket 'covers'
            coverUrl = getFileUrl('covers', book.cover_image);
          }
        }
        
        return {
          ...book,
          coverUrl
        };
      });
      
      setBooks(booksWithCovers || []);
    } catch (err) {
      console.error('Erro ao carregar livros:', err);
      setError('Falha ao carregar os livros. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };
  
  // Função para excluir um livro
  const handleDeleteBook = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este livro? Esta ação não pode ser desfeita.')) {
      try {
        setDeleteLoading(id);
        const { error } = await deleteBook(id);
        
        if (error) {
          throw error;
        }
        
        // Atualizar a lista de livros
        setBooks(books.filter(book => book.id !== id));
      } catch (err) {
        console.error('Erro ao excluir livro:', err);
        alert('Falha ao excluir o livro. Por favor, tente novamente.');
      } finally {
        setDeleteLoading(null);
      }
    }
  };
  
  // Função para criar um novo livro
  const handleCreateBook = () => {
    router.push('/books/new');
  };
  
  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Carregando livros...</div>
        </div>
      </Layout>
    );
  }
  
  return (
    <>
      <Head>
        <title>Gerenciar Livros | UniverseTeca CMS</title>
      </Head>
      
      <Layout>
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Gerenciar Livros</h1>
            
            <button
              onClick={handleCreateBook}
              className="flex items-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              <FiPlus className="mr-2" />
              Novo Livro
            </button>
          </div>
          
          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
              {error}
            </div>
          )}
          
          {books.length === 0 ? (
            <div className="bg-gray-100 p-8 rounded-lg text-center">
              <p className="text-lg text-gray-600 mb-4">
                Nenhum livro encontrado
              </p>
              <button
                onClick={handleCreateBook}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Criar meu primeiro livro
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {books.map(book => (
                <div key={book.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div 
                    className="h-48 bg-gray-200 flex items-center justify-center"
                    style={{
                      backgroundImage: book.coverUrl ? `url(${book.coverUrl})` : 'none',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }}
                  >
                    {!book.coverUrl && (
                      <div className="flex flex-col items-center justify-center text-gray-500">
                        <FiBook size={32} />
                        <span className="mt-2">Sem capa</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-4">
                    <h2 className="text-xl font-semibold mb-2 truncate">
                      {book.title || 'Sem título'}
                    </h2>
                    
                    <p className="text-gray-600 text-sm mb-2">
                      <span className="font-medium">Autor:</span> {book.authors?.name || 'Desconhecido'}
                    </p>
                    
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {book.description || 'Sem descrição'}
                    </p>
                    
                    <div className="flex justify-between">
                      <button
                        onClick={() => router.push(`/books/${book.id}/edit`)}
                        className="flex items-center px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        <FiEdit className="mr-1" />
                        Editar
                      </button>
                      
                      <button
                        onClick={() => handleDeleteBook(book.id)}
                        className="flex items-center px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                        disabled={deleteLoading === book.id}
                      >
                        <FiTrash2 className="mr-1" />
                        {deleteLoading === book.id ? 'Excluindo...' : 'Excluir'}
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