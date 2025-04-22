import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { createBook } from '../../lib/books';
import { getAuthors } from '../../lib/authors';
import { getCategories } from '../../lib/categories';
import { useAuth } from '../../contexts/auth';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { FaArrowLeft, FaImage } from 'react-icons/fa';
import MediaLibrary from '../../components/editor/MediaLibrary';
import EditorLayout from '../../components/EditorLayout';
import Head from 'next/head';

export default function NewBook() {
  const [title, setTitle] = useState('');
  const [authorId, setAuthorId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [authors, setAuthors] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingAuthors, setLoadingAuthors] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  
  const { user, loading: isLoading } = useAuth();
  const router = useRouter();
  
  // Verificar autenticação
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [isLoading, user, router]);

  // Carregar autores
  useEffect(() => {
    async function loadAuthors() {
      try {
        setLoadingAuthors(true);
        const { data, error } = await getAuthors();
        if (error) throw error;
        setAuthors(data || []);
      } catch (err) {
        console.error('Erro ao carregar autores:', err);
        toast.error('Falha ao carregar a lista de autores');
      } finally {
        setLoadingAuthors(false);
      }
    }
    
    loadAuthors();
  }, []);

  // Carregar categorias
  useEffect(() => {
    async function loadCategories() {
      try {
        setLoadingCategories(true);
        const { data, error } = await getCategories();
        if (error) throw error;
        setCategories(data || []);
      } catch (err) {
        console.error('Erro ao carregar categorias:', err);
        toast.error('Falha ao carregar a lista de categorias');
      } finally {
        setLoadingCategories(false);
      }
    }
    
    loadCategories();
  }, []);

  const handleMediaSelected = (file) => {
    console.log('Imagem selecionada da MediaLibrary:', file);
    setCoverImage(file.publicUrl || file.url);
    setShowMediaLibrary(false);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // Validação básica
      if (!title.trim()) {
        throw new Error('O título do livro é obrigatório');
      }
      
      const bookData = {
        title: title.trim(),
        author_id: authorId || null,
        category_id: categoryId || null,
        description: description.trim(),
        cover_image: coverImage,
        created_at: new Date().toISOString(),
        pages: [{
          id: Date.now().toString(),
          background: '',
          elements: [],
          orientation: 'portrait'
        }]
      };
      
      console.log('Enviando dados do livro para criação:', bookData);
      
      const { data, error } = await createBook(bookData);
      
      if (error) {
        console.error('Erro retornado pela função createBook:', error);
        throw new Error(error.message || 'Erro ao criar o livro');
      }
      
      toast.success('Livro criado com sucesso!');
      router.push('/books');
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
      <EditorLayout>
        <Head>
          <title>Novo Livro - UniverseTeca</title>
        </Head>
        <div className="text-center p-8">Carregando...</div>
      </EditorLayout>
    );
  }
  
  return (
    <EditorLayout>
      <Head>
        <title>Novo Livro - UniverseTeca</title>
      </Head>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center mb-6">
          <h1 className="text-2xl font-bold">Criar Novo Livro</h1>
        </div>
        
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="title">
              Título*
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="author">
              Autor
            </label>
            <select
              id="author"
              value={authorId}
              onChange={(e) => setAuthorId(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            >
              <option value="">Selecione um autor</option>
              {loadingAuthors ? (
                <option disabled>Carregando autores...</option>
              ) : (
                authors.map(author => (
                  <option key={author.id} value={author.id}>
                    {author.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="category">
              Categoria
            </label>
            <select
              id="category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            >
              <option value="">Selecione uma categoria</option>
              {loadingCategories ? (
                <option disabled>Carregando categorias...</option>
              ) : (
                categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))
              )}
            </select>
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="description">
              Descrição
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              rows="4"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Capa do Livro
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
              {coverImage && (
                <div className="text-sm text-green-600">Imagem selecionada</div>
              )}
            </div>
            
            {coverImage && (
              <div className="mt-4 border rounded p-4">
                <p className="text-sm text-gray-500 mb-2">Prévia:</p>
                <img src={coverImage} alt="Capa do livro" className="max-h-48 object-contain" />
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
              {loading ? 'Criando...' : 'Criar Livro'}
            </button>
          </div>
        </form>
        
        {showMediaLibrary && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-4 w-full max-w-4xl h-3/4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">Selecionar Imagem de Capa</h3>
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
    </EditorLayout>
  );
}

export async function getServerSideProps() {
  return {
    props: {}, // Será preenchido com dados client-side
  };
} 