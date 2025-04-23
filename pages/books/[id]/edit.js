import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { FiChevronLeft, FiSave, FiPlus, FiTrash2, FiRefreshCw, FiMove, FiPlay, FiChevronUp, FiChevronDown, FiCopy, FiType, FiImage, FiMusic, FiEye, FiEyeOff, FiChevronRight, FiBook, FiEdit } from 'react-icons/fi';

import { useAuth } from '../../../contexts/auth';
import { getBook, updateBook } from '../../../lib/books';
import { getAuthors } from '../../../lib/authors';
import { getCategories } from '../../../lib/categories';
import CanvasEditor from '../../../components/editor/CanvasEditor';
import EditorLayout from '../../../components/EditorLayout';
import MediaLibrary from '../../../components/editor/MediaLibrary';

// Deep clone utility to prevent reference issues
const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

// Animation options
const ANIMATIONS = [
  { value: '', label: 'No Animation' },
  { value: 'animate__fadeIn', label: 'Fade In' },
  { value: 'animate__fadeInUp', label: 'Fade In Up' },
  { value: 'animate__fadeInDown', label: 'Fade In Down' },
  { value: 'animate__zoomIn', label: 'Zoom In' },
  { value: 'animate__slideInLeft', label: 'Slide In Left' },
  { value: 'animate__slideInRight', label: 'Slide In Right' },
  { value: 'animate__bounce', label: 'Bounce' },
  { value: 'animate__pulse', label: 'Pulse' },
  { value: 'animate__rubberBand', label: 'Rubber Band' }
];

// Text style options
const TEXT_STYLES = [
  { value: 'normal', label: 'Texto Normal' },
  { value: 'narrative', label: 'Narrativa' },
  { value: 'speech', label: 'Balão de Fala' },
  { value: 'thought', label: 'Pensamento' }
];

export default function EditBook() {
  const router = useRouter();
  const { id } = router.query;
  const { user, loading: authLoading } = useAuth();
  
  const [book, setBook] = useState(null);
  const [pages, setPages] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [isModified, setIsModified] = useState(false);
  const [selectedElement, setSelectedElement] = useState(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  
  // Add tabs state
  const [currentTab, setCurrentTab] = useState('pages');
  
  // Add states for book details
  const [title, setTitle] = useState('');
  const [authorId, setAuthorId] = useState('');
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [authors, setAuthors] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState('');
  const [loadingAuthors, setLoadingAuthors] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  
  // Prevent re-fetching when saving
  const savingRef = useRef(false);

  // Add state for Media Library
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [mediaSelectionType, setMediaSelectionType] = useState(null);

  // Verificar autenticação
  useEffect(() => {
    async function checkAuth() {
      console.log("Estado de autenticação:", { authLoading, user });
      if (!authLoading && !user) {
        console.log("Usuário não autenticado, redirecionando para login");
        router.push('/login');
      }
    }
    
    checkAuth();
  }, [authLoading, user, router]);

  // Carregar dados do livro
  useEffect(() => {
    console.log("Verificando id e user para buscar livro:", { id, user });
    if (id && user) {
      fetchBook(id);
      fetchAuthors();
      fetchCategories();
    } else if (!id && !router.isReady) {
      // Router ainda não está pronto, esperando
      console.log("Router não está pronto ainda, aguardando...");
    } else if (!id && router.isReady) {
      // Router está pronto mas não temos id
      console.log("Router pronto, mas ID não encontrado");
      setLoading(false);
      // Redirecionar para lista de livros
      router.push('/books');
    }
  }, [id, user, router.isReady]);

  // Função para buscar o livro
  const fetchBook = async (bookId) => {
    console.log("Iniciando fetchBook com ID:", bookId);
    try {
      setLoading(true);
      const { data, error } = await getBook(bookId);
      console.log("Resultado getBook:", { data, error });
      
      if (error) {
        console.error("Erro na busca do livro:", error);
        // Se o livro não existir, criar um livro vazio temporário para edição
        setBook({
          id: bookId,
          title: 'Novo Livro',
          author: '',
          description: '',
          cover: '',
          pages: []
        });
        
        // Inicializar com uma página vazia
        setPages([{
          id: Date.now().toString(),
          background: '',
          elements: [],
          orientation: 'portrait'
        }]);
        
        setLoading(false);
        return;
      }
      
      if (data) {
        console.log("Livro carregado com sucesso:", data);
        setBook(data);
        
        // Inicializar detalhes do livro
        setTitle(data.title || '');
        setAuthorId(data.author_id || '');
        setDescription(data.description || '');
        setCoverImage(data.cover_image || '');
        setCategoryId(data.category_id || '');
        
        // Inicializar as páginas do livro
        if (data.pages && data.pages.length > 0) {
          // Usar JSON para clone profundo - evita referências cruzadas
          const deepClonedPages = JSON.parse(JSON.stringify(data.pages));
          setPages(deepClonedPages);
          console.log("Páginas inicializadas:", deepClonedPages.length);
        } else {
          console.log("Livro não tem páginas ou array está vazio");
          // Inicializa com uma página vazia caso não tenha páginas
          setPages([{
            id: Date.now().toString(),
            background: '',
            elements: [],
            orientation: 'portrait'
          }]);
        }
      } else {
        // Dados não encontrados, criar um livro vazio temporário
        console.log("Nenhum dado encontrado para o ID:", bookId);
        setBook({
          id: bookId,
          title: 'Novo Livro',
          author: '',
          description: '',
          cover: '',
          pages: []
        });
        
        // Inicializar com uma página vazia
        setPages([{
          id: Date.now().toString(),
          background: '',
          elements: [],
          orientation: 'portrait'
        }]);
      }
    } catch (error) {
      console.error('Error fetching book:', error);
      alert('Erro ao carregar o livro. Tente novamente.');
      // Mesmo com erro, criar um livro temporário
      setBook({
        id: bookId,
        title: 'Novo Livro (Erro)',
        author: '',
        description: '',
        cover: '',
        pages: []
      });
      
      // Inicializar com uma página vazia
      setPages([{
        id: Date.now().toString(),
        background: '',
        elements: [],
        orientation: 'portrait'
      }]);
    } finally {
      console.log("Finalizando fetchBook, setando loading como false");
      setLoading(false);
    }
  };

  // Buscar autores
  const fetchAuthors = async () => {
    try {
      setLoadingAuthors(true);
      const { data, error } = await getAuthors();
      if (error) throw error;
      setAuthors(data || []);
    } catch (err) {
      console.error('Erro ao carregar autores:', err);
    } finally {
      setLoadingAuthors(false);
    }
  };

  // Buscar categorias
  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const { data, error } = await getCategories();
      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      console.error('Erro ao carregar categorias:', err);
    } finally {
      setLoadingCategories(false);
    }
  };

  // Handle page content changes from CanvasEditor - otimizado com useCallback
  const handlePageChange = useCallback((index) => {
    setCurrentPage(index);
  }, []);

  // Update current page data
  const handlePageUpdate = useCallback((pageData) => {
    // Deep clone to avoid reference issues
    const newPages = deepClone(pages);
    newPages[currentPage] = {
      ...newPages[currentPage],
      ...pageData
    };
    
    setPages(newPages);
    setIsModified(true);
  }, [pages, currentPage]);

  // Add page to book
  const addPage = useCallback(() => {
    // Deep clone to avoid reference issues
    const newPages = deepClone(pages);
    
    // Create new page with unique ID
    const newPage = {
      id: Date.now().toString(), // Using timestamp as stable ID
      background: '',
      elements: [],
      orientation: 'portrait'
    };
    
    newPages.push(newPage);
    setPages(newPages);
    setCurrentPage(newPages.length - 1);
    setIsModified(true);
  }, [pages]);

  // Delete current page
  const deletePage = useCallback(() => {
    if (pages.length <= 1) {
      alert('Um livro precisa ter pelo menos uma página.');
      return;
    }

    // Deep clone to avoid reference issues
    const newPages = deepClone(pages);
    newPages.splice(currentPage, 1);
    
    setPages(newPages);
    setCurrentPage(Math.min(currentPage, newPages.length - 1));
    setIsModified(true);
  }, [pages, currentPage]);

  // Função para salvar automaticamente as páginas sem feedback visual
  const autoSavePages = useCallback(async (pagesArray) => {
    if (!book || !id) return;
    
    try {
      setAutoSaving(true);
      const updates = {
        pages: pagesArray
      };
      
      await updateBook(id, updates);
      console.log('Páginas salvas automaticamente');
      
      setTimeout(() => {
        setAutoSaving(false);
      }, 1000);
    } catch (error) {
      console.error('Erro ao salvar automaticamente:', error);
      setAutoSaving(false);
    }
  }, [book, id]);

  // Save book with updated pages (com feedback visual)
  const saveBook = useCallback(async () => {
    if (!book || !id) return;
    
    // Set saving flag to prevent re-fetching
    setSaving(true);
    savingRef.current = true;
    
    try {
      console.log("Salvando livro com ID:", id);
      console.log("Estado atual do livro:", book);
      console.log("Estado atual das páginas:", pages);
      
      // Atualizar o book para incluir as páginas atuais e detalhes
      const updatedBook = {
        ...book,
        title,
        author_id: authorId,
        description,
        cover_image: coverImage,
        category_id: categoryId,
        pages: deepClone(pages) // Usar as páginas atuais
      };
      
      // Remover o campo authors que veio do JOIN com a tabela de autores
      if (updatedBook.authors) {
        delete updatedBook.authors;
      }
      
      console.log("Dados do livro a serem salvos:", updatedBook);
      console.log("Tamanho dos dados (bytes):", new Blob([JSON.stringify(updatedBook)]).size);
      
      const result = await updateBook(id, updatedBook);
      console.log("Resultado do updateBook:", result);
      
      if (result.error) {
        console.error("ERRO DETALHADO:", result.error);
        alert(`Falha ao salvar: ${result.error.message || JSON.stringify(result.error)}`);
        throw result.error;
      }
      
      console.log("Livro salvo com sucesso!");
      setIsModified(false);
    } catch (error) {
      console.error('ERRO COMPLETO AO SALVAR:', error);
      // Mostrar detalhes do erro para debug
      let errorDetails = "Erro desconhecido";
      if (error.message) {
        errorDetails = error.message;
      } else if (typeof error === 'object') {
        try {
          errorDetails = JSON.stringify(error);
        } catch (e) {
          errorDetails = "Erro não serializável: " + Object.keys(error).join(', ');
        }
      }
      
      alert(`Falha ao salvar alterações. Motivo: ${errorDetails}`);
    } finally {
      setSaving(false);
      savingRef.current = false;
    }
  }, [book, id, pages, title, authorId, description, coverImage, categoryId]);

  // Go back to books list
  const goBack = useCallback(() => {
    if (isModified) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to leave?');
      if (!confirmed) return;
    }
    router.push('/books');
  }, [router, isModified]);

  // Element handlers
  const handleElementChange = useCallback((id, updates) => {
    setPages(prev => {
      const updated = deepClone(prev);
      const elementIndex = updated[currentPage].elements.findIndex(el => el.id === id);
      if (elementIndex !== -1) {
        updated[currentPage].elements[elementIndex] = {
          ...updated[currentPage].elements[elementIndex],
          ...updates
        };
      }
      return updated;
    });
    setIsModified(true);
  }, [currentPage]);

  const handlePlayAnimation = useCallback((id, animation) => {
    const element = pages[currentPage].elements.find(el => el.id === id);
    if (element) {
      const el = document.getElementById(`el-${id}`);
      if (el) {
        el.classList.remove('animate__animated');
        ANIMATIONS.forEach(anim => {
          if (anim.value) el.classList.remove(anim.value);
        });
        void el.offsetWidth;
        el.classList.add('animate__animated');
        if (animation) {
          el.classList.add(animation);
        } else {
          el.classList.add('animate__bounce');
        }
      }
    }
  }, [currentPage, pages]);

  const handleImageRotate = useCallback((id, direction) => {
    handleElementChange(id, {
      rotation: direction === 'right' 
        ? ((pages[currentPage].elements.find(el => el.id === id)?.rotation || 0) + 90) % 360 
        : ((pages[currentPage].elements.find(el => el.id === id)?.rotation || 0) - 90 + 360) % 360
    });
  }, [currentPage, pages, handleElementChange]);

  const handleImageFlip = useCallback((id, direction) => {
    const element = pages[currentPage].elements.find(el => el.id === id);
    if (element) {
      handleElementChange(id, {
        flipH: direction === 'horizontal' ? !(element.flipH || false) : (element.flipH || false),
        flipV: direction === 'vertical' ? !(element.flipV || false) : (element.flipV || false)
      });
    }
  }, [currentPage, pages, handleElementChange]);

  const handleTextStyleChange = useCallback((id, textStyle) => {
    handleElementChange(id, { textStyle });
  }, [handleElementChange]);

  const handleAnimationChange = useCallback((id, animation) => {
    handleElementChange(id, { animation });
  }, [handleElementChange]);

  // Additional handlers needed for the toolbar
  const handleMoveForward = useCallback((id) => {
    setPages(prev => {
      const updated = deepClone(prev);
      const element = updated[currentPage].elements.find(el => el.id === id);
      if (!element) return updated;
      
      // Find the next highest z-index
      const maxZIndex = Math.max(...updated[currentPage].elements.map(el => el.zIndex || 0));
      element.zIndex = maxZIndex + 1;
      
      return updated;
    });
    setIsModified(true);
  }, [currentPage]);

  const handleMoveBackward = useCallback((id) => {
    setPages(prev => {
      const updated = deepClone(prev);
      const element = updated[currentPage].elements.find(el => el.id === id);
      if (!element) return updated;
      
      // Find elements with lower z-index
      const lowerElements = updated[currentPage].elements.filter(el => 
        (el.zIndex || 0) < (element.zIndex || 0)
      );
      if (lowerElements.length === 0) return updated;
      
      // Find the highest z-index among lower elements
      const maxLowerZIndex = Math.max(...lowerElements.map(el => el.zIndex || 0));
      // Set z-index just below that
      element.zIndex = maxLowerZIndex - 1;
      
      return updated;
    });
    setIsModified(true);
  }, [currentPage]);

  const handleImageStyleChange = useCallback((id, styleUpdate) => {
    setPages(prev => {
      const updated = deepClone(prev);
      const element = updated[currentPage].elements.find(el => el.id === id);
      if (!element) return updated;
      
      element.imageStyle = {
        ...(element.imageStyle || {}),
        ...styleUpdate
      };
      
      return updated;
    });
    setIsModified(true);
  }, [currentPage]);

  const handleFitToAspectRatio = useCallback((id, ratio) => {
    const element = pages[currentPage].elements.find(el => el.id === id);
    if (!element) return;
    
    let newWidth = element.size.width;
    let newHeight = element.size.height;
    
    if (ratio === "1:1") {
      // Make it square based on the larger dimension
      const size = Math.max(element.size.width, element.size.height);
      newWidth = size;
      newHeight = size;
    } else if (ratio === "4:3") {
      // 4:3 aspect ratio
      if (element.size.width > element.size.height) {
        newHeight = (element.size.width * 3) / 4;
      } else {
        newWidth = (element.size.height * 4) / 3;
      }
    } else if (ratio === "16:9") {
      // 16:9 aspect ratio
      if (element.size.width > element.size.height) {
        newHeight = (element.size.width * 9) / 16;
      } else {
        newWidth = (element.size.height * 16) / 9;
      }
    }
    
    handleElementChange(id, {
      size: { width: newWidth, height: newHeight }
    });
  }, [currentPage, pages, handleElementChange]);

  const handleResetImageTransform = useCallback((id) => {
    handleElementChange(id, {
      rotation: 0,
      flipH: false,
      flipV: false
    });
  }, [handleElementChange]);

  const handleDuplicateElement = useCallback((id) => {
    setPages(prev => {
      const updated = deepClone(prev);
      const elementToDuplicate = updated[currentPage].elements.find(el => el.id === id);
      if (!elementToDuplicate) return updated;
      
      const duplicatedElement = {
        ...deepClone(elementToDuplicate),
        id: Date.now().toString(),
        position: {
          x: elementToDuplicate.position.x + 20,
          y: elementToDuplicate.position.y + 20
        },
        zIndex: Math.max(...updated[currentPage].elements.map(el => el.zIndex || 0), 0) + 1
      };
      
      updated[currentPage].elements.push(duplicatedElement);
      setSelectedElement(duplicatedElement.id);
      return updated;
    });
    setIsModified(true);
  }, [currentPage, setSelectedElement]);

  const handleRemoveElement = useCallback((id) => {
    setPages(prev => {
      const updated = deepClone(prev);
      updated[currentPage].elements = updated[currentPage].elements.filter(el => el.id !== id);
      return updated;
    });
    
    if (selectedElement === id) {
      setSelectedElement(null);
    }
    setIsModified(true);
  }, [currentPage, selectedElement, setSelectedElement]);

  // Handlers for adding elements and toggling preview mode
  const handleAddText = useCallback((textStyle = 'normal') => {
    const newElement = {
      id: Date.now().toString(),
      type: 'text',
      textStyle: textStyle,
      content: 'Clique para editar',
      position: { x: 50, y: 50 },
      size: { width: 200, height: 'auto' },
      animation: '',
      step: 0,
      zIndex: (pages[currentPage]?.elements?.length || 0) + 1
    };
    
    setPages(prev => {
      const updated = deepClone(prev);
      updated[currentPage].elements = [...updated[currentPage].elements, newElement];
      return updated;
    });
    
    setSelectedElement(newElement.id);
    setIsModified(true);
  }, [currentPage, pages, setSelectedElement]);
  
  // Updated Media Library handler
  const handleShowMediaLibrary = useCallback((type) => {
    setMediaSelectionType(type);
    setShowMediaLibrary(true);
  }, []);
  
  // Handle media selection
  const handleMediaSelected = useCallback((file) => {
    // Use file.url instead of just url
    const url = file.url;
    console.log("Media selected:", { type: mediaSelectionType, url, file });
    
    // Handle cover image selection
    if (mediaSelectionType === 'image' && currentTab === 'details') {
      handleCoverImageSelect(file);
      return;
    }
    
    if (mediaSelectionType === 'background') {
      // Update background of current page
      console.log("Setting background for page", currentPage, "to", url);
      setPages(prev => {
        const updated = deepClone(prev);
        updated[currentPage].background = url;
        console.log("Updated page background:", updated[currentPage].background);
        return updated;
      });
      setIsModified(true);
      setShowMediaLibrary(false);
      return;
    }
    
    if (mediaSelectionType === 'image') {
      const newElement = {
        id: Date.now().toString(),
        type: 'image',
        content: url,
        position: { x: 50, y: 50 },
        size: { width: 200, height: 200 },
        animation: '',
        step: 0,
        imageStyle: {
          objectFit: 'cover',
          borderRadius: 0
        },
        zIndex: (pages[currentPage]?.elements?.length || 0) + 1
      };
      
      setPages(prev => {
        const updated = deepClone(prev);
        updated[currentPage].elements = [...updated[currentPage].elements, newElement];
        return updated;
      });
      
      setSelectedElement(newElement.id);
      setIsModified(true);
    } else if (mediaSelectionType === 'audio') {
      const newElement = {
        id: Date.now().toString(),
        type: 'audio',
        content: url,
        position: { x: 50, y: 50 },
        size: { width: 300, height: 50 },
        animation: '',
        step: 0,
        zIndex: (pages[currentPage]?.elements?.length || 0) + 1
      };
      
      setPages(prev => {
        const updated = deepClone(prev);
        updated[currentPage].elements = [...updated[currentPage].elements, newElement];
        return updated;
      });
      
      setSelectedElement(newElement.id);
      setIsModified(true);
    }
    
    setShowMediaLibrary(false);
  }, [mediaSelectionType, currentPage, pages, setSelectedElement, currentTab]);
  
  // Handle closing the Media Library
  const handleCloseMediaLibrary = useCallback(() => {
    setShowMediaLibrary(false);
  }, []);

  const togglePreviewMode = useCallback(() => {
    setIsPreviewMode(prev => !prev);
    if (isPreviewMode) {
      setSelectedElement(null);
    }
  }, [isPreviewMode]);

  // Handle cover image selection
  const handleCoverImageSelect = useCallback((file) => {
    if (file && file.url) {
      setCoverImage(file.url);
      setShowMediaLibrary(false);
      setIsModified(true);
    }
  }, []);

  if (loading) {
    return (
      <EditorLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading book...</div>
        </div>
      </EditorLayout>
    );
  }

  if (!user || !book) {
    return null;
  }

  return (
    <EditorLayout>
      <Head>
        <title>{book?.title || 'Editar Livro'} - UniverseTeca</title>
      </Head>
      
      <div className="p-4">
        {/* Debug info - can be removed later */}
        {console.log("Current page background:", pages[currentPage]?.background)}
        
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">{title || 'Edit Book'}</h1>
        </div>
        
        {/* Tabs */}
        <div className="flex mb-6 border-b border-gray-200">
          <button
            onClick={() => setCurrentTab('details')}
            className={`py-2 px-4 font-medium ${
              currentTab === 'details' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center">
              <FiEdit className="mr-2" />
              Detalhes do Livro
            </div>
          </button>
          <button
            onClick={() => setCurrentTab('pages')}
            className={`py-2 px-4 font-medium ${
              currentTab === 'pages' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center">
              <FiBook className="mr-2" />
              Editor de Páginas
            </div>
          </button>
        </div>
        
        {/* Book Details Tab */}
        {currentTab === 'details' && (
          <div className="bg-white shadow-lg rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Informações do Livro</h2>
            
            {/* Cover Image */}
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Capa do Livro
              </label>
              <div className="flex items-start">
                <div 
                  className="w-48 h-64 bg-gray-200 rounded border overflow-hidden flex items-center justify-center"
                  style={{
                    backgroundImage: coverImage ? `url(${coverImage})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                >
                  {!coverImage && (
                    <div className="text-gray-500 flex flex-col items-center">
                      <FiImage size={32} />
                      <span className="mt-2">Sem capa</span>
                    </div>
                  )}
                </div>
                
                <div className="ml-4 flex flex-col">
                  <button
                    onClick={() => {
                      setMediaSelectionType('image');
                      setShowMediaLibrary(true);
                    }}
                    className="flex items-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mb-2"
                  >
                    <FiImage className="mr-2" />
                    {coverImage ? 'Alterar Capa' : 'Adicionar Capa'}
                  </button>
                  
                  {coverImage && (
                    <button
                      onClick={() => {
                        setCoverImage('');
                        setIsModified(true);
                      }}
                      className="flex items-center px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      <FiTrash2 className="mr-2" />
                      Remover Capa
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            {/* Title */}
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="title">
                Título*
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setIsModified(true);
                }}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                required
              />
            </div>
            
            {/* Author */}
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="author">
                Autor
              </label>
              <select
                id="author"
                value={authorId}
                onChange={(e) => {
                  setAuthorId(e.target.value);
                  setIsModified(true);
                }}
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
            
            {/* Category */}
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="category">
                Categoria
              </label>
              <select
                id="category"
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  setIsModified(true);
                }}
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
            
            {/* Description */}
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="description">
                Descrição
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setIsModified(true);
                }}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline h-32"
                placeholder="Descrição do livro"
              />
            </div>
          </div>
        )}
        
        {/* Page Editor Tab */}
        {currentTab === 'pages' && (
          <>
            {/* Page navigation */}
            <div className="flex items-center mb-4 space-x-2">
              <select
                value={currentPage}
                onChange={(e) => handlePageChange(parseInt(e.target.value))}
                className="border border-gray-300 rounded px-3 py-2"
              >
                {pages.map((page, index) => (
                  <option key={page.id} value={index}>
                    Page {index + 1}
                  </option>
                ))}
              </select>
              
              <button
                onClick={addPage}
                className="flex items-center px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                title="Add Page"
              >
                <FiPlus />
              </button>
              
              {pages.length > 1 && (
                <button
                  onClick={deletePage}
                  className="flex items-center px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                  title="Delete Page"
                >
                  <FiTrash2 />
                </button>
              )}

              <button
                onClick={saveBook}
                disabled={saving || !isModified}
                className={`flex items-center px-3 py-2 ${
                  saving || !isModified ? 'bg-gray-400' : 'bg-green-500 hover:bg-green-600'
                } text-white rounded`}
                title="Salvar Alterações"
              >
                <FiSave className="mr-1" />
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
              
              {/* Ferramentas para adicionar elementos - Simplificado */}
              <div className="flex items-center ml-4 space-x-2 border-l border-gray-300 pl-4">
                <div className="relative group">
                  <button
                    onClick={() => handleAddText('normal')}
                    className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    title="Adicionar texto"
                  >
                    <FiType size={18} />
                  </button>
                  <div className="absolute top-full left-0 mt-2 hidden group-hover:flex flex-col bg-white shadow-lg rounded p-1 border border-gray-200 z-10">
                    {TEXT_STYLES.map(style => (
                      <button
                        key={style.value}
                        onClick={() => handleAddText(style.value)}
                        className="p-1 hover:bg-gray-100 rounded text-left text-sm whitespace-nowrap"
                      >
                        {style.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                <button
                  onClick={() => handleShowMediaLibrary('image')}
                  className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  title="Adicionar imagem"
                >
                  <FiImage size={18} />
                </button>
                
                <button
                  onClick={() => handleShowMediaLibrary('audio')}
                  className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  title="Adicionar áudio"
                >
                  <FiMusic size={18} />
                </button>
                
                <button
                  onClick={() => handleShowMediaLibrary('background')}
                  className="p-2 bg-green-500 text-white rounded hover:bg-green-600"
                  title="Alterar background"
                >
                  Background
                </button>
                
                {pages[currentPage]?.background && (
                  <button
                    onClick={() => {
                      // Remove background of current page
                      setPages(prev => {
                        const updated = deepClone(prev);
                        updated[currentPage].background = '';
                        return updated;
                      });
                      setIsModified(true);
                    }}
                    className="p-2 bg-red-500 text-white rounded hover:bg-red-600"
                    title="Remover background"
                  >
                    <FiTrash2 size={18} />
                  </button>
                )}
              </div>
              
              {/* Controle de modo de visualização */}
              <div className="flex items-center ml-4 space-x-2 border-l border-gray-300 pl-4">
                <button
                  onClick={togglePreviewMode}
                  className={`p-2 ${isPreviewMode ? 'bg-red-500 hover:bg-red-600' : 'bg-purple-500 hover:bg-purple-600'} text-white rounded`}
                  title={isPreviewMode ? "Sair da visualização" : "Visualizar animações"}
                >
                  {isPreviewMode ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
                
                {/* Navegação de etapas - visível apenas no modo de visualização */}
                {isPreviewMode && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => currentStep > 0 && setCurrentStep(currentStep - 1)}
                      disabled={currentStep === 0}
                      className={`p-2 ${currentStep === 0 ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'} text-white rounded`}
                      title="Previous Step"
                    >
                      <FiChevronLeft size={18} />
                    </button>
                    
                    <div className="px-2 py-1 bg-gray-100 rounded">
                      <span className="text-sm">Etapa: {currentStep}</span>
                    </div>
                    
                    <button
                      onClick={() => {
                        // Find the maximum step in all elements
                        const maxStep = Math.max(...pages[currentPage].elements.map(el => el.step || 0), 0);
                        if (currentStep < maxStep) {
                          setCurrentStep(currentStep + 1);
                        }
                      }}
                      disabled={currentStep >= Math.max(...pages[currentPage].elements.map(el => el.step || 0), 0)}
                      className={`p-2 ${currentStep >= Math.max(...pages[currentPage].elements.map(el => el.step || 0), 0) ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'} text-white rounded`}
                      title="Next Step"
                    >
                      <FiChevronRight size={18} />
                    </button>
                  </div>
                )}
              </div>
              
              {/* Element controls */}
              {selectedElement && !isPreviewMode && (
                <div className="flex items-center space-x-2 ml-4 bg-white border p-2 rounded shadow">
                  <span className="text-sm font-medium">Elemento selecionado:</span>
                  
                  {/* Step selector */}
                  <div className="flex items-center bg-gray-100 px-2 py-1 rounded">
                    <span className="text-xs mr-2">Etapa:</span>
                    <input
                      type="number"
                      min="0"
                      value={pages[currentPage].elements.find(el => el.id === selectedElement)?.step || 0}
                      onChange={(e) => handleElementChange(selectedElement, { step: parseInt(e.target.value || 0) })}
                      className="w-12 border border-gray-300 rounded px-1 py-0.5 text-sm"
                    />
                  </div>
                  
                  {/* Image style selectors - manter apenas os dropdowns */}
                  {pages[currentPage].elements.find(el => el.id === selectedElement)?.type === 'image' && (
                    <div className="flex items-center space-x-2">
                      <select
                        value={pages[currentPage].elements.find(el => el.id === selectedElement)?.imageStyle?.objectFit || 'contain'}
                        onChange={(e) => handleImageStyleChange(selectedElement, { objectFit: e.target.value })}
                        className="border border-gray-300 rounded px-2 py-1 text-sm"
                        title="Ajuste da imagem"
                      >
                        <option value="contain">Conter</option>
                        <option value="cover">Cobrir</option>
                        <option value="fill">Preencher</option>
                      </select>
                      
                      <select
                        value="none"
                        onChange={(e) => {
                          if (e.target.value === "1:1") handleFitToAspectRatio(selectedElement, "1:1");
                          if (e.target.value === "4:3") handleFitToAspectRatio(selectedElement, "4:3");
                          if (e.target.value === "16:9") handleFitToAspectRatio(selectedElement, "16:9");
                          if (e.target.value === "reset") handleResetImageTransform(selectedElement);
                        }}
                        className="border border-gray-300 rounded px-2 py-1 text-sm"
                      >
                        <option value="none">Proporção</option>
                        <option value="1:1">1:1 (Quadrado)</option>
                        <option value="4:3">4:3</option>
                        <option value="16:9">16:9</option>
                        <option value="reset">Resetar</option>
                      </select>
                    </div>
                  )}
                  
                  {/* Text style selector */}
                  {pages[currentPage].elements.find(el => el.id === selectedElement)?.type === 'text' && (
                    <select
                      value={pages[currentPage].elements.find(el => el.id === selectedElement)?.textStyle || 'normal'}
                      onChange={(e) => handleTextStyleChange(selectedElement, e.target.value)}
                      className="border border-gray-300 rounded px-2 py-1 text-sm"
                    >
                      {TEXT_STYLES.map(style => (
                        <option key={style.value} value={style.value}>
                          {style.label}
                        </option>
                      ))}
                    </select>
                  )}
                  
                  {/* Animation selector */}
                  <select
                    value={pages[currentPage].elements.find(el => el.id === selectedElement)?.animation || ''}
                    onChange={(e) => handleAnimationChange(selectedElement, e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1 text-sm"
                  >
                    {ANIMATIONS.map(anim => (
                      <option key={anim.value} value={anim.value}>
                        {anim.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              <div className="ml-4 text-sm text-gray-500">
                {isModified ? 'Unsaved changes' : 'No unsaved changes'}
              </div>
            </div>
            
            {/* Canvas editor */}
            <div className="bg-white p-6 rounded-lg shadow relative">
              {pages.length > 0 && currentPage < pages.length && (
                <CanvasEditor
                  page={pages[currentPage]}
                  onChange={handlePageUpdate}
                  selectedElement={selectedElement}
                  setSelectedElement={setSelectedElement}
                  onElementChange={handleElementChange}
                  onPlayAnimation={handlePlayAnimation}
                  onImageRotate={handleImageRotate}
                  onImageFlip={handleImageFlip}
                  onTextStyleChange={handleTextStyleChange}
                  onAnimationChange={handleAnimationChange}
                  onMoveForward={handleMoveForward}
                  onMoveBackward={handleMoveBackward}
                  onImageStyleChange={handleImageStyleChange}
                  onDuplicateElement={handleDuplicateElement}
                  onRemoveElement={handleRemoveElement}
                  isPreviewMode={isPreviewMode}
                  setIsPreviewMode={setIsPreviewMode}
                  currentStep={currentStep}
                  setCurrentStep={setCurrentStep}
                />
              )}
            </div>
          </>
        )}
        
        {/* Media Library Modal */}
        {showMediaLibrary && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-4/5 h-4/5 flex flex-col">
              <div className="flex justify-between items-center border-b p-4">
                <h2 className="text-xl font-semibold">
                  {mediaSelectionType === 'image' && currentTab === 'details' 
                    ? 'Selecionar Capa do Livro' 
                    : mediaSelectionType === 'image' 
                      ? 'Adicionar Imagem' 
                      : mediaSelectionType === 'audio' 
                        ? 'Adicionar Áudio' 
                        : 'Selecionar Fundo'}
                </h2>
                <button
                  onClick={() => setShowMediaLibrary(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  &times;
                </button>
              </div>
              <div className="flex-1 overflow-auto">
                <MediaLibrary
                  onSelect={handleMediaSelected}
                  mediaType={mediaSelectionType}
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
    props: {}, // Será preenchido por dados client-side
  }
} 