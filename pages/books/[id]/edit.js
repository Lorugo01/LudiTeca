import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { FiChevronLeft, FiSave, FiPlus, FiTrash2, FiRefreshCw, FiMove, FiPlay, FiChevronUp, FiChevronDown, FiCopy, FiType, FiImage, FiMusic, FiEye, FiEyeOff, FiChevronRight, FiBook, FiEdit, FiX, FiLayers, FiUpload } from 'react-icons/fi';

import { useAuth } from '../../../contexts/auth';
import { getBook, updateBook } from '../../../lib/books';
import { getAuthors } from '../../../lib/authors';
import { getCategories } from '../../../lib/categories';
import CanvasEditor, { AVAILABLE_FONTS } from '../../../components/editor/CanvasEditor';
import LoadingProgressOverlay from '../../../components/LoadingProgressOverlay';
import EditorLayout from '../../../components/EditorLayout';
import MediaLibrary from '../../../components/editor/MediaLibrary';
import StepContoler from '../../../components/editor/StepContoler';
import ShapeSelector from '../../../components/editor/ShapeSelector';
import { importPptxForBook } from '../../../lib/pptxImport';

// Deep clone utility to prevent reference issues
const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

// Função para sanitizar as páginas antes de salvar
const sanitizePages = (pages) => {
  return pages.map(page => ({
    ...page,
    elements: page.elements.map(el => ({
      ...el,
      size: {
        width: typeof el.size.width === 'number' ? el.size.width : 100,
        height: typeof el.size.height === 'number' ? el.size.height : 100, // Corrige "auto"
      }
    }))
  }));
};

const hasPageWarning = (page) => Boolean(page?.needsAdjustment);

const getDraftStorageKey = (bookId) => `luditeca:book-edit-draft:${bookId}`;

const loadDraftFromStorage = (bookId) => {
  if (!bookId || typeof window === 'undefined') return null;

  try {
    const rawDraft = window.sessionStorage.getItem(getDraftStorageKey(bookId));
    if (!rawDraft) return null;

    const parsedDraft = JSON.parse(rawDraft);
    if (!parsedDraft || !Array.isArray(parsedDraft.pages)) return null;

    return parsedDraft;
  } catch (error) {
    console.error('Erro ao restaurar rascunho local:', error);
    return null;
  }
};

const saveDraftToStorage = (bookId, draft) => {
  if (!bookId || typeof window === 'undefined') return;

  try {
    window.sessionStorage.setItem(getDraftStorageKey(bookId), JSON.stringify(draft));
  } catch (error) {
    console.error('Erro ao salvar rascunho local:', error);
  }
};

const clearDraftFromStorage = (bookId) => {
  if (!bookId || typeof window === 'undefined') return;

  try {
    window.sessionStorage.removeItem(getDraftStorageKey(bookId));
  } catch (error) {
    console.error('Erro ao limpar rascunho local:', error);
  }
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
  const [jsonSize, setJsonSize] = useState(0);
  
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

  // Add history state
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [clipboard, setClipboard] = useState(null);

  // Refs para manter o histórico sincronizado sem recriar callbacks
  const historyRef = useRef(history);
  const historyIndexRef = useRef(historyIndex);
  const loadedBookIdRef = useRef(null);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    historyIndexRef.current = historyIndex;
  }, [historyIndex]);
  // Adicionar estados para reprodução
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackInterval, setPlaybackInterval] = useState(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(1000); // 1 segundo por etapa

  // Add state for background editor
  const [showBackgroundEditor, setShowBackgroundEditor] = useState(false);
  const [backgroundScale, setBackgroundScale] = useState(1);
  const [backgroundPosition, setBackgroundPosition] = useState({ x: 0.5, y: 0.5 });

  // Add state for Layer Manager
  const [showLayerManager, setShowLayerManager] = useState(false);
  const [isImportingPptx, setIsImportingPptx] = useState(false);
  const [pptxImportProgress, setPptxImportProgress] = useState(null);
  const pptxInputRef = useRef(null);

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

  // Carregar dados do livro apenas quando o ID realmente mudar
  useEffect(() => {
    console.log("Verificando id e user para buscar livro:", { id, user });
    if (id && user?.id) {
      if (loadedBookIdRef.current === id) return;

      loadedBookIdRef.current = id;
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
  }, [id, user?.id, router.isReady]);

  // Avisar ao usuário se tentar sair com alterações não salvas (fechar aba/atualizar)
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (!isModified) return;
      event.preventDefault();
      // Mensagem customizada é ignorada pelos browsers modernos, mas `returnValue` precisa ser setado
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isModified]);

  // Interceptar mudanças de rota do Next para evitar perder alterações sem confirmação
  useEffect(() => {
    const handleRouteChangeStart = (url) => {
      if (!isModified) return;

      const confirmLeave = window.confirm(
        'Você tem alterações não salvas. Tem certeza que deseja sair desta página?'
      );

      if (!confirmLeave) {
        // Cancelar a navegação
        router.events.emit('routeChangeError');
        // Lançar erro para interromper a transição (padrão Next.js)
        // eslint-disable-next-line no-throw-literal
        throw 'Route change aborted due to unsaved changes';
      }
    };

    router.events.on('routeChangeStart', handleRouteChangeStart);
    return () => {
      router.events.off('routeChangeStart', handleRouteChangeStart);
    };
  }, [isModified, router.events]);

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
          setCurrentPage(0);
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
          setCurrentPage(0);
        }

        // Se houver rascunho local (não salvo), prioriza o rascunho para não perder trabalho
        const draft = loadDraftFromStorage(bookId);
        if (draft) {
          setTitle(draft.title ?? data.title ?? '');
          setAuthorId(draft.authorId ?? data.author_id ?? '');
          setDescription(draft.description ?? data.description ?? '');
          setCoverImage(draft.coverImage ?? data.cover_image ?? '');
          setCategoryId(draft.categoryId ?? data.category_id ?? '');
          setPages(deepClone(draft.pages));
          setCurrentPage(
            Math.min(
              draft.currentPage ?? 0,
              Math.max((draft.pages?.length || 1) - 1, 0)
            )
          );
          setIsModified(true);
          console.log("Rascunho local restaurado");
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
        setCurrentPage(0);
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
      setCurrentPage(0);
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

  // Função para salvar estado no histórico usando refs para evitar loops de renderização
  const saveToHistory = useCallback((newState) => {
    const currentHistory = historyRef.current;
    const currentIndex = historyIndexRef.current;

    const newHistory = currentHistory.slice(0, currentIndex + 1);
    newHistory.push(deepClone(newState));

    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    console.log('Estado salvo no histórico:', newState);
  }, []);

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
      saveToHistory(updated);
      return updated;
    });
    setIsModified(true);
  }, [currentPage, saveToHistory]);

  // Add page to book
  const addPage = useCallback(() => {
    setPages(prev => {
      const updated = deepClone(prev);
      const newPage = {
        id: Date.now().toString(),
        background: '',
        elements: [],
        orientation: 'portrait'
      };
      updated.push(newPage);
      saveToHistory(updated);
      return updated;
    });
    setCurrentPage(pages.length);
    setIsModified(true);
  }, [pages.length, saveToHistory]);

  // Delete current page
  const deletePage = useCallback(() => {
    if (pages.length <= 1) {
      alert('Um livro precisa ter pelo menos uma página.');
      return;
    }

    setPages(prev => {
      const updated = deepClone(prev);
      updated.splice(currentPage, 1);
      saveToHistory(updated);
      return updated;
    });
    setCurrentPage(Math.min(currentPage, pages.length - 2));
    setIsModified(true);
  }, [currentPage, pages.length, saveToHistory]);

  // Função para salvar automaticamente as páginas sem feedback visual
  const autoSavePages = useCallback(async (pagesArray) => {
    if (!book || !id) return;
    
    try {
      setAutoSaving(true);
      const updates = {
        pages: sanitizePages(pagesArray) // Usar sanitizePages em vez de passar diretamente
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
        pages: sanitizePages(pages) // Usar sanitizePages em vez de deepClone
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
      clearDraftFromStorage(id);
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

  // Persistir rascunho local enquanto houver alteração não salva
  useEffect(() => {
    if (!id || !book || !isModified) return;

    saveDraftToStorage(id, {
      title,
      authorId,
      description,
      coverImage,
      categoryId,
      pages,
      currentPage,
      updatedAt: Date.now()
    });
  }, [
    id,
    book,
    isModified,
    title,
    authorId,
    description,
    coverImage,
    categoryId,
    pages,
    currentPage
  ]);

  // Go back to books list
  const goBack = useCallback(() => {
    if (isModified) {
      const confirmed = window.confirm('Você tem alterações não salvas. Tem certeza que deseja sair?');
      if (!confirmed) return;
    }
    router.push('/books');
  }, [isModified, router]);

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
      saveToHistory(updated);
      return updated;
    });
    
    setSelectedElement(null);
    setIsModified(true);
  }, [currentPage, saveToHistory]);

  const handleRemoveElement = useCallback((id) => {
    setPages(prev => {
      const updated = deepClone(prev);
      updated[currentPage].elements = updated[currentPage].elements.filter(el => el.id !== id);
      saveToHistory(updated);
      return updated;
    });
    
    if (selectedElement === id) {
      setSelectedElement(null);
    }
    setIsModified(true);
  }, [currentPage, selectedElement, setSelectedElement, saveToHistory]);

  // Handlers for adding elements
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
      zIndex: (pages[currentPage]?.elements?.length || 0) + 1,
      // Novos campos de estilo
      fontSize: 16,
      fontFamily: 'Roboto',
      fontWeight: 'normal',
      fontStyle: 'normal',
      textAlign: 'left',
      color: '#000000'
    };
    
    setPages(prev => {
      const updated = deepClone(prev);
      updated[currentPage].elements.push(newElement);
      saveToHistory(updated);
      return updated;
    });
    
    setSelectedElement(newElement.id);
    setIsModified(true);
  }, [currentPage, pages, setSelectedElement, saveToHistory]);
  
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
      // Update background of current page with new structure
      setPages(prev => {
        const updated = deepClone(prev);
        updated[currentPage].background = {
          url: url,
          position: { x: 0.5, y: 0.5 },
          scale: 1
        };
        return updated;
      });
      setIsModified(true);
      setShowMediaLibrary(false);
      return;
    }
    
    if (mediaSelectionType === 'audio' && selectedElement) {
      setPages(prev => {
        const updated = deepClone(prev);
        const el = updated[currentPage].elements.find(el => el.id === selectedElement);
        if (el) {
          if (el.type === 'shape') {
            el.text = {
              ...el.text,
              audio: url,
              audioButtonPosition: {
                x: el.size.width - 40,
                y: 8
              }
            };
          } else {
            el.audio = url;
            el.audioButtonPosition = {
              x: el.size.width - 40,
              y: 8
            };
          }
        }
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
    }
    
    setShowMediaLibrary(false);
  }, [mediaSelectionType, currentPage, pages, setSelectedElement, currentTab, selectedElement, handleElementChange]);
  
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

  // Função para calcular o tamanho do JSON
  const calculateJsonSize = useCallback(() => {
    const bookData = {
      ...book,
      title,
      author_id: authorId,
      description,
      cover_image: coverImage,
      category_id: categoryId,
      pages: deepClone(pages)
    };
    
    const size = new Blob([JSON.stringify(bookData)]).size;
    setJsonSize(size);
  }, [book, title, authorId, description, coverImage, categoryId, pages]);

  // Atualizar o tamanho quando houver mudanças
  useEffect(() => {
    calculateJsonSize();
  }, [calculateJsonSize]);

  // Função para desfazer (Ctrl+Z)
  const handleUndo = useCallback((e) => {
    if (e.ctrlKey && e.key === 'z') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        const previousState = deepClone(history[newIndex]);
        setPages(previousState);
        console.log('Estado desfeito:', previousState);
        setIsModified(true);
      }
    }
  }, [history, historyIndex]);

  // Função para refazer (Ctrl+Y)
  const handleRedo = useCallback((e) => {
    if (e.ctrlKey && e.key === 'y') {
      e.preventDefault();
      if (historyIndex < history.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        const nextState = deepClone(history[newIndex]);
        setPages(nextState);
        console.log('Estado refeito:', nextState);
        setIsModified(true);
      }
    }
  }, [history, historyIndex]);

  // Função para copiar (Ctrl+C)
  const handleCopy = useCallback((e) => {
    if (e.ctrlKey && e.key === 'c' && selectedElement) {
      e.preventDefault();
      const element = pages[currentPage].elements.find(el => el.id === selectedElement);
      if (element) {
        setClipboard(deepClone(element));
      }
    }
  }, [selectedElement, pages, currentPage]);

  // Função para colar (Ctrl+V)
  const handlePaste = useCallback((e) => {
    if (e.ctrlKey && e.key === 'v' && clipboard) {
      e.preventDefault();
      const newElement = {
        ...deepClone(clipboard),
        id: Date.now().toString(),
        position: {
          x: clipboard.position.x + 20,
          y: clipboard.position.y + 20
        }
      };
      
      setPages(prev => {
        const updated = deepClone(prev);
        updated[currentPage].elements.push(newElement);
        return updated;
      });
      
      setSelectedElement(newElement.id);
      setIsModified(true);
    }
  }, [clipboard, currentPage]);

  // Função para recortar (Ctrl+X)
  const handleCut = useCallback((e) => {
    if (e.ctrlKey && e.key === 'x' && selectedElement) {
      e.preventDefault();
      const element = pages[currentPage].elements.find(el => el.id === selectedElement);
      if (element) {
        setClipboard(deepClone(element));
        setPages(prev => {
          const updated = deepClone(prev);
          updated[currentPage].elements = updated[currentPage].elements.filter(el => el.id !== selectedElement);
          return updated;
        });
        setSelectedElement(null);
        setIsModified(true);
      }
    }
  }, [selectedElement, pages, currentPage]);

  // Função para deletar (Delete)
  const handleDelete = useCallback((e) => {
    if (e.key === 'Delete' && selectedElement) {
      e.preventDefault();
      setPages(prev => {
        const updated = deepClone(prev);
        updated[currentPage].elements = updated[currentPage].elements.filter(el => el.id !== selectedElement);
        return updated;
      });
      setSelectedElement(null);
      setIsModified(true);
    }
  }, [selectedElement, currentPage]);

  // Adicionar event listeners para atalhos de teclado
  useEffect(() => {
    window.addEventListener('keydown', handleUndo);
    window.addEventListener('keydown', handleRedo);
    window.addEventListener('keydown', handleCopy);
    window.addEventListener('keydown', handlePaste);
    window.addEventListener('keydown', handleCut);
    window.addEventListener('keydown', handleDelete);

    return () => {
      window.removeEventListener('keydown', handleUndo);
      window.removeEventListener('keydown', handleRedo);
      window.removeEventListener('keydown', handleCopy);
      window.removeEventListener('keydown', handlePaste);
      window.removeEventListener('keydown', handleCut);
      window.removeEventListener('keydown', handleDelete);
    };
  }, [handleUndo, handleRedo, handleCopy, handlePaste, handleCut, handleDelete]);

  // Atualizar histórico quando houver mudanças nas páginas
  useEffect(() => {
    if (pages.length > 0 && !savingRef.current) {
      saveToHistory(pages);
    }
  }, [pages, saveToHistory]);

  // Função para controlar a reprodução
  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      // Pausar reprodução
      if (playbackInterval) {
        clearInterval(playbackInterval);
        setPlaybackInterval(null);
      }
    } else {
      // Iniciar reprodução
      const interval = setInterval(() => {
        setCurrentStep(prev => {
          const maxStep = Math.max(...pages[currentPage].elements.map(el => el.step || 0), 0);
          if (prev >= maxStep) {
            clearInterval(interval);
            setPlaybackInterval(null);
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, playbackSpeed);
      setPlaybackInterval(interval);
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, playbackInterval, pages, currentPage, playbackSpeed]);

  // Função para voltar uma etapa
  const handleStepBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  // Função para avançar uma etapa
  const handleStepForward = useCallback(() => {
    const maxStep = Math.max(...pages[currentPage].elements.map(el => el.step || 0), 0);
    if (currentStep < maxStep) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, pages]);

  const handlePptxFileChange = useCallback(async (event) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile || !id || !user?.id) return;

    try {
      setIsImportingPptx(true);
      setPptxImportProgress({
        phase: 'upload',
        percent: 0,
        message: 'Iniciando envio do arquivo…',
      });
      const payload = await importPptxForBook({
        bookId: id,
        userId: user.id,
        file: selectedFile,
        onProgress: (info) => {
          setPptxImportProgress({
            phase: info.phase,
            percent:
              typeof info.percent === 'number' ? info.percent : null,
            message: info.message || '',
          });
        },
      });

      if (!Array.isArray(payload?.pages) || payload.pages.length === 0) {
        throw new Error('A importação não gerou páginas válidas.');
      }

      const importedPages = deepClone(payload.pages);
      setPages(importedPages);
      setCurrentPage(0);
      setCurrentStep(0);
      setSelectedElement(null);
      setCurrentTab('pages');
      setIsModified(true);
      saveToHistory(importedPages);
      const warningCount = Array.isArray(payload?.warnings) ? payload.warnings.length : 0;
      if (warningCount > 0) {
        alert(
          `${payload?.message || 'Importação concluída com avisos.'}\n` +
            `Páginas com ajuste manual: ${warningCount}.`,
        );
      } else {
        alert(payload?.message || `Importação concluída com ${importedPages.length} páginas.`);
      }
    } catch (error) {
      alert(`Falha ao importar PPTX: ${error.message || 'erro desconhecido'}`);
    } finally {
      setIsImportingPptx(false);
      if (event.target) {
        event.target.value = '';
      }
      setTimeout(() => setPptxImportProgress(null), 400);
    }
  }, [id, user?.id, saveToHistory]);

  if (loading) {
    return (
      <EditorLayout variant="editor">
        <LoadingProgressOverlay
          active
          title="Carregando editor"
          message="Buscando o livro, autores e categorias. Isso costuma levar poucos segundos."
          mode="indeterminate"
        />
      </EditorLayout>
    );
  }

  if (!user || !book) {
    return null;
  }

  return (
    <EditorLayout variant="editor">
      <Head>
        <title>{book?.title || 'Editar Livro'} - UniverseTeca</title>
      </Head>

      {isImportingPptx ? (
        <LoadingProgressOverlay
          active
          title="Importando…"
          message=""
          compact
          showFooterHint={false}
          mode={
            typeof pptxImportProgress?.percent === 'number'
              ? 'determinate'
              : 'indeterminate'
          }
          percent={
            typeof pptxImportProgress?.percent === 'number'
              ? pptxImportProgress.percent
              : 0
          }
        />
      ) : null}
      
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-gray-900">
        {/* Barra superior com título e controles principais */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-700 bg-gray-800 px-4 py-2 text-white">
          <div className="flex items-center space-x-4">
            <button
              onClick={goBack}
              className="flex items-center text-gray-300 hover:text-white"
            >
              <FiChevronLeft className="mr-1" size={20} />
              Voltar
            </button>

            <h1 className="text-xl font-semibold">{title || 'Edit Book'}</h1>
            <button
              onClick={saveBook}
              disabled={saving || !isModified}
              className={`flex items-center px-3 py-1 rounded ${
                saving || !isModified ? 'bg-gray-700 text-gray-400' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <FiSave className="mr-1" />
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>

        {/* Abas */}
        <div className="flex-shrink-0 border-b border-gray-700 bg-gray-800 px-4 text-white">
          <div className="flex space-x-4">
            <button
              onClick={() => setCurrentTab('pages')}
              className={`py-2 px-4 ${
                currentTab === 'pages'
                  ? 'border-b-2 border-blue-500 text-blue-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Páginas
            </button>
            <button
              onClick={() => setCurrentTab('details')}
              className={`py-2 px-4 ${
                currentTab === 'details'
                  ? 'border-b-2 border-blue-500 text-blue-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Detalhes do Livro
            </button>
          </div>
        </div>

        {/* Conteúdo das abas */}
        {currentTab === 'details' ? (
          <div className="min-h-0 flex-1 overflow-y-auto bg-gray-900 p-6">
            <div className="max-w-2xl mx-auto bg-gray-800 rounded-lg p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Título
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2"
                    placeholder="Digite o título do livro"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Autor
                  </label>
                  <select
                    value={authorId}
                    onChange={(e) => setAuthorId(e.target.value)}
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2"
                  >
                    <option value="">Selecione um autor</option>
                    {authors.map(author => (
                      <option key={author.id} value={author.id}>
                        {author.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Categoria
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2"
                  >
                    <option value="">Selecione uma categoria</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Descrição
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 h-32"
                    placeholder="Digite a descrição do livro"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Capa do Livro
                  </label>
                  <div className="flex items-center space-x-4">
                    <div 
                      className="w-32 h-32 bg-gray-700 rounded flex items-center justify-center"
                      style={{
                        backgroundImage: coverImage ? `url(${coverImage})` : 'none',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                      }}
                    >
                      {!coverImage && <FiImage size={24} className="text-gray-400" />}
                    </div>
                    <button
                      onClick={() => {
                        setMediaSelectionType('image');
                        setShowMediaLibrary(true);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      {coverImage ? 'Alterar Capa' : 'Adicionar Capa'}
                    </button>
                  </div>
                </div>

                <div className="border border-gray-700 rounded-md p-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Importar PPTX
                  </label>
                  <p className="text-xs text-gray-400 mb-3">
                    Envie um arquivo .pptx para gerar páginas automáticas no livro.
                  </p>
                  <input
                    ref={pptxInputRef}
                    type="file"
                    accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                    onChange={handlePptxFileChange}
                    className="hidden"
                    disabled={isImportingPptx}
                  />
                  <button
                    type="button"
                    onClick={() => pptxInputRef.current?.click()}
                    disabled={isImportingPptx}
                    className={`px-4 py-2 rounded text-white flex items-center ${
                      isImportingPptx
                        ? 'bg-gray-600 cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-700'
                    }`}
                  >
                    <FiUpload className="mr-2" />
                    {isImportingPptx ? 'Importando PPTX...' : 'Importar arquivo PPTX'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {/* Controles de página */}
            <div className="flex-shrink-0 border-b border-gray-700 bg-gray-800 p-2">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <select
                  value={currentPage}
                  onChange={(e) => handlePageChange(parseInt(e.target.value))}
                  className="bg-gray-700 text-white border border-gray-600 rounded px-2 py-1"
                >
                  {pages.map((page, index) => (
                    <option key={page.id} value={index}>
                      {hasPageWarning(page) ? '⚠ ' : ''}Página {index + 1}
                    </option>
                  ))}
                </select>
                
                <button
                  onClick={addPage}
                  className="p-1 text-gray-300 hover:text-white hover:bg-gray-700 rounded"
                  title="Adicionar página"
                >
                  <FiPlus size={20} />
                </button>
                
                {pages.length > 1 && (
                  <button
                    onClick={deletePage}
                    className="p-1 text-gray-300 hover:text-white hover:bg-gray-700 rounded"
                    title="Remover página"
                  >
                    <FiTrash2 size={20} />
                  </button>
                )}

                {/* Botões de elementos */}
                <div className="flex items-center space-x-1 ml-2 border-l border-gray-600 pl-2">
                  <button
                    onClick={() => handleAddText('normal')}
                    className="p-1 text-gray-300 hover:text-white hover:bg-gray-700 rounded"
                    title="Adicionar texto"
                  >
                    <FiType size={20} />
                  </button>
                  
                  <button
                    onClick={() => handleShowMediaLibrary('image')}
                    className="p-1 text-gray-300 hover:text-white hover:bg-gray-700 rounded"
                    title="Adicionar imagem"
                  >
                    <FiImage size={20} />
                  </button>
                  
                  <ShapeSelector onAddShape={(shapeType) => {
                    const newElement = {
                      id: Date.now().toString(),
                      type: 'shape',
                      shapeProperties: {
                        type: shapeType,
                        fill: '#fcfdff',
                        borderColor: '#0d0d0d',
                        borderWidth: 2,
                        borderRadius: shapeType === 'rectangle' ? 0 : undefined
                      },
                      position: { x: 50, y: 50 },
                      size: { width: 150, height: 150 },
                      animation: '',
                      step: 0,
                      zIndex: (pages[currentPage]?.elements?.length || 0) + 1
                    };
                    
                    setPages(prev => {
                      const updated = deepClone(prev);
                      updated[currentPage].elements.push(newElement);
                      saveToHistory(updated);
                      return updated;
                    });
                    
                    setSelectedElement(newElement.id);
                    setIsModified(true);
                  }} />
                  
                  <button
                    onClick={() => setShowLayerManager(prev => !prev)}
                    className={`p-1 rounded ${
                      showLayerManager ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-700'
                    }`}
                    title={showLayerManager ? 'Mostrar Propriedades' : 'Mostrar Camadas'}
                  >
                    <FiLayers size={20} />
                  </button>
                  <button
                    onClick={() => handleShowMediaLibrary('background')}
                    className="p-1 text-gray-300 hover:text-white hover:bg-gray-700 rounded"
                    title="Alterar background"
                  >
                    <FiImage size={20} />
                    <span className="text-xs ml-1">BG</span>
                  </button>

                  <button
                    onClick={() => {
                      setPages(prev => {
                        const updated = deepClone(prev);
                        updated[currentPage].background = '';
                        return updated;
                      });
                      setIsModified(true);
                    }}
                    className="p-1 text-gray-300 hover:text-white hover:bg-gray-700 rounded"
                    title="Remover background"
                  >
                    <FiTrash2 size={20} />
                    <span className="text-xs ml-1">BG</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowBackgroundEditor(true);
                    }}
                    className="p-1 text-gray-300 hover:text-white hover:bg-gray-700 rounded"
                    title="Editar background"
                  >
                    <FiEdit size={20} />
                    <span className="text-xs ml-1">BG</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Área do Editor */}
            <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
              {/* Barra lateral esquerda - StepContoler */}
              <div className="flex w-44 min-w-0 flex-shrink-0 flex-col border-r border-gray-700 bg-gray-800 md:w-48">
                <StepContoler
                  currentStep={currentStep}
                  maxSteps={Math.max(...(pages[currentPage]?.elements?.map(el => el.step || 0) || [0]), 0)}
                  onStepChange={setCurrentStep}
                  isPlaying={isPlaying}
                  onPlayPause={handlePlayPause}
                  onStepBack={handleStepBack}
                  onStepForward={handleStepForward}
                  elements={pages[currentPage]?.elements || []}
                  onElementSelect={setSelectedElement}
                />
              </div>

              {/* Área do Canvas */}
              <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                {hasPageWarning(pages[currentPage]) && (
                  <div className="mx-2 mt-2 flex-shrink-0 rounded border border-yellow-600 bg-yellow-900/30 px-3 py-2 text-sm text-yellow-200 md:mx-4">
                    ⚠ Esta página precisa de ajuste manual: {pages[currentPage]?.adjustmentReason || 'falha na importação do slide'}.
                  </div>
                )}
                {/* Canvas */}
                <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden bg-gray-900">
                  <div className="relative h-full min-h-0 w-full min-w-0">
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
                  </div>
                </div>
              </div>

              {/* Barra lateral direita - Propriedades e Gerenciador de Camadas */}
              <div className="flex w-44 min-w-0 flex-shrink-0 flex-col overflow-y-auto border-l border-gray-700 bg-gray-800 p-2 md:w-48">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-white text-xs font-medium">
                    {showLayerManager ? 'Camadas' : 'Propriedades'}
                  </h3>
                </div>

                {showLayerManager ? (
                  <div className="space-y-2">
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {pages[currentPage]?.elements
                        .sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0))
                        .map(element => (
                          <div
                            key={element.id}
                            className={`p-1 rounded text-xs cursor-pointer flex items-center justify-between ${
                              selectedElement === element.id ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
                            }`}
                            onClick={() => setSelectedElement(element.id)}
                          >
                            <span className="truncate">
                              {element.type === 'text' ? 'Texto' : element.type === 'image' ? 'Imagem' : element.type}
                            </span>
                            <div className="flex space-x-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveForward(element.id);
                                }}
                                className="p-0.5 hover:bg-gray-500 rounded"
                                title="Mover para frente"
                              >
                                <FiChevronUp size={12} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveBackward(element.id);
                                }}
                                className="p-0.5 hover:bg-gray-500 rounded"
                                title="Mover para trás"
                              >
                                <FiChevronDown size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                ) : (
                  selectedElement && (
                    <div className="space-y-2">
                      {/* Bloco de áudio para qualquer elemento */}
                      <div className="space-y-1">
                        <label className="text-gray-300 text-xs">Áudio</label>
                        {(() => {
                          const el = pages[currentPage].elements.find(el => el.id === selectedElement);
                          const audioValue = el?.type === 'shape' ? el?.text?.audio : el?.audio;
                          if (audioValue) {
                            return (
                              <div className="space-y-1">
                                <audio controls src={audioValue} className="w-full h-8" />
                                <button
                                  onClick={() => {
                                    if (el.type === 'shape') {
                                      handleElementChange(selectedElement, {
                                        text: {
                                          ...el.text,
                                          audio: null
                                        }
                                      });
                                    } else {
                                      handleElementChange(selectedElement, { audio: null });
                                    }
                                  }}
                                  className="w-full flex items-center justify-center p-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs"
                                >
                                  <FiTrash2 size={12} className="mr-1" />
                                  Remover Áudio
                                </button>
                              </div>
                            );
                          } else {
                            return (
                              <button
                                onClick={() => handleShowMediaLibrary('audio')}
                                className="w-full flex items-center justify-center p-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                              >
                                <FiMusic size={12} className="mr-1" />
                                Adicionar Áudio
                              </button>
                            );
                          }
                        })()}
                      </div>
                      {/* Bloco de propriedades de texto das formas */}
                      {pages[currentPage].elements.find(el => el.id === selectedElement)?.type === 'shape' && (
                        <div className="mt-4 pt-4 border-t border-gray-600">
                          <h3 className="text-gray-300 text-xs font-semibold mb-2">Texto da Forma</h3>
                          <div className="space-y-1">
                            <label className="text-gray-300 text-xs">Fonte</label>
                            <select
                              value={pages[currentPage].elements.find(el => el.id === selectedElement)?.text?.fontFamily || 'Roboto'}
                              onChange={(e) => handleElementChange(selectedElement, { 
                                text: {
                                  ...pages[currentPage].elements.find(el => el.id === selectedElement)?.text,
                                  fontFamily: e.target.value
                                }
                              })}
                              className="w-full bg-gray-700 text-white border border-gray-600 rounded px-1 py-0.5 text-xs"
                            >
                              {AVAILABLE_FONTS.map(font => (
                                <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                                  {font.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-gray-300 text-xs">Tamanho da Fonte</label>
                            <input
                              type="number"
                              min="8"
                              max="72"
                              value={pages[currentPage].elements.find(el => el.id === selectedElement)?.text?.fontSize || 16}
                              onChange={(e) => handleElementChange(selectedElement, { 
                                text: {
                                  ...pages[currentPage].elements.find(el => el.id === selectedElement)?.text,
                                  fontSize: parseInt(e.target.value || 16)
                                }
                              })}
                              className="w-full bg-gray-700 text-white border border-gray-600 rounded px-1 py-0.5 text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-gray-300 text-xs">Alinhamento</label>
                            <select
                              value={pages[currentPage].elements.find(el => el.id === selectedElement)?.text?.textAlign || 'center'}
                              onChange={(e) => handleElementChange(selectedElement, { 
                                text: {
                                  ...pages[currentPage].elements.find(el => el.id === selectedElement)?.text,
                                  textAlign: e.target.value
                                }
                              })}
                              className="w-full bg-gray-700 text-white border border-gray-600 rounded px-1 py-0.5 text-xs"
                            >
                              <option value="left">Esquerda</option>
                              <option value="center">Centro</option>
                              <option value="right">Direita</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-gray-300 text-xs">Cor do Texto</label>
                            <input
                              type="color"
                              value={pages[currentPage].elements.find(el => el.id === selectedElement)?.text?.color || '#000000'}
                              onChange={(e) => handleElementChange(selectedElement, { 
                                text: {
                                  ...pages[currentPage].elements.find(el => el.id === selectedElement)?.text,
                                  color: e.target.value
                                }
                              })}
                              className="w-full"
                            />
                          </div>
                          <div className="flex space-x-2 mt-2">
                            <button
                              onClick={() => handleElementChange(selectedElement, { 
                                text: {
                                  ...pages[currentPage].elements.find(el => el.id === selectedElement)?.text,
                                  fontWeight: pages[currentPage].elements.find(el => el.id === selectedElement)?.text?.fontWeight === 'bold' ? 'normal' : 'bold'
                                }
                              })}
                              className={`p-1 rounded ${pages[currentPage].elements.find(el => el.id === selectedElement)?.text?.fontWeight === 'bold' ? 'bg-blue-600' : 'bg-gray-700'} hover:bg-blue-500`}
                              title="Negrito"
                            >
                              <span className="font-bold text-white">B</span>
                            </button>
                            <button
                              onClick={() => handleElementChange(selectedElement, { 
                                text: {
                                  ...pages[currentPage].elements.find(el => el.id === selectedElement)?.text,
                                  fontStyle: pages[currentPage].elements.find(el => el.id === selectedElement)?.text?.fontStyle === 'italic' ? 'normal' : 'italic'
                                }
                              })}
                              className={`p-1 rounded ${pages[currentPage].elements.find(el => el.id === selectedElement)?.text?.fontStyle === 'italic' ? 'bg-blue-600' : 'bg-gray-700'} hover:bg-blue-500`}
                              title="Itálico"
                            >
                              <span className="italic text-white">I</span>
                            </button>
                          </div>
                        </div>
                      )}
                      {/* Controles de propriedades */}
                      <div className="space-y-1">
                        <label className="text-gray-300 text-xs">Etapa</label>
                        <input
                          type="number"
                          min="0"
                          value={pages[currentPage].elements.find(el => el.id === selectedElement)?.step || 0}
                          onChange={(e) => handleElementChange(selectedElement, { step: parseInt(e.target.value || 0) })}
                          className="w-full bg-gray-700 text-white border border-gray-600 rounded px-1 py-0.5 text-xs"
                        />
                      </div>

                      {/* Animações */}
                      <div className="space-y-1">
                        <label className="text-gray-300 text-xs">Animação</label>
                        <select
                          value={pages[currentPage].elements.find(el => el.id === selectedElement)?.animation || ''}
                          onChange={(e) => handleAnimationChange(selectedElement, e.target.value)}
                          className="w-full bg-gray-700 text-white border border-gray-600 rounded px-1 py-0.5 text-xs"
                        >
                          {ANIMATIONS.map(anim => (
                            <option key={anim.value} value={anim.value}>
                              {anim.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Ações rápidas */}
                      <div className="flex flex-wrap gap-1">
                        <button
                          onClick={() => handleDuplicateElement(selectedElement)}
                          className="flex items-center p-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                          title="Duplicar"
                        >
                          <FiCopy size={12} />
                        </button>
                        
                        <button
                          onClick={() => handleRemoveElement(selectedElement)}
                          className="flex items-center p-1 bg-red-600 text-white rounded hover:bg-red-700"
                          title="Remover"
                        >
                          <FiTrash2 size={12} />
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        )}

        {/* Media Library Modal */}
        {showMediaLibrary && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg w-full max-w-5xl max-h-[min(90vh,900px)] overflow-hidden flex flex-col">
              <div className="flex-shrink-0 p-4 border-b border-gray-700 flex justify-between items-center">
                <h2 className="text-white text-xl font-semibold">
                  {mediaSelectionType === 'background' ? 'Selecionar Background' : 
                   mediaSelectionType === 'image' ? 'Selecionar Imagem' : 
                   mediaSelectionType === 'audio' ? 'Selecionar Áudio' : 'Biblioteca de Mídia'}
                </h2>
                <button
                  type="button"
                  onClick={() => setShowMediaLibrary(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <FiX size={24} />
                </button>
              </div>
              
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                <MediaLibrary 
                  onSelect={handleMediaSelected}
                  mediaType={mediaSelectionType}
                />
              </div>
            </div>
          </div>
        )}

        {/* Background Editor Modal */}
        {showBackgroundEditor && pages[currentPage]?.background && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-[800px] max-w-[90vw]">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-white text-xl font-semibold">Editar Background</h2>
                <button
                  onClick={() => setShowBackgroundEditor(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <FiX size={24} />
                </button>
              </div>

              <div className="relative w-full" style={{ paddingTop: '75%' }}>
                <div 
                  className="absolute inset-0 bg-gray-900 rounded overflow-hidden"
                  style={{
                    backgroundImage: `url(${typeof pages[currentPage].background === 'string' ? pages[currentPage].background : pages[currentPage].background?.url})`,
                    backgroundSize: `${backgroundScale * 100}%`,
                    backgroundPosition: `${backgroundPosition.x * 100}% ${backgroundPosition.y * 100}%`,
                    backgroundRepeat: 'no-repeat'
                  }}
                >
                  {/* Área de recorte */}
                  <div 
                    className="absolute cursor-move border-2 border-white border-dashed bg-black bg-opacity-50"
                    style={{
                      width: '80%',
                      height: '80%',
                      left: '10%',
                      top: '10%'
                    }}
                    onMouseDown={(e) => {
                      const container = e.currentTarget.parentElement;
                      const rect = container.getBoundingClientRect();
                      const cropRect = e.currentTarget.getBoundingClientRect();
                      const startX = e.clientX;
                      const startY = e.clientY;
                      const startLeft = ((cropRect.left - rect.left) / rect.width);
                      const startTop = ((cropRect.top - rect.top) / rect.height);
                      
                      const handleMouseMove = (moveEvent) => {
                        const deltaX = (moveEvent.clientX - startX) / rect.width;
                        const deltaY = (moveEvent.clientY - startY) / rect.height;
                        
                        const newX = Math.max(0, Math.min(0.2, startLeft + deltaX));
                        const newY = Math.max(0, Math.min(0.2, startTop + deltaY));
                        
                        setBackgroundPosition({
                          x: 0.5 + (newX - 0.1) * 5,
                          y: 0.5 + (newY - 0.1) * 5
                        });
                      };
                      
                      const handleMouseUp = () => {
                        document.removeEventListener('mousemove', handleMouseMove);
                        document.removeEventListener('mouseup', handleMouseUp);
                      };
                      
                      document.addEventListener('mousemove', handleMouseMove);
                      document.addEventListener('mouseup', handleMouseUp);
                    }}
                  />
                </div>
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-white text-sm mb-2">Zoom</label>
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.1"
                    value={backgroundScale}
                    onChange={(e) => setBackgroundScale(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => setShowBackgroundEditor(false)}
                    className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      setPages(prev => {
                        const updated = deepClone(prev);
                        const currentBg = updated[currentPage].background;
                        updated[currentPage].background = {
                          url: typeof currentBg === 'string' ? currentBg : currentBg?.url,
                          position: backgroundPosition,
                          scale: backgroundScale
                        };
                        return updated;
                      });
                      setIsModified(true);
                      setShowBackgroundEditor(false);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Salvar
                  </button>
                </div>
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