import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Rnd } from 'react-rnd';
import { FiType, FiImage, FiMusic, FiTrash2, FiCopy, FiChevronUp, FiChevronDown, FiPlay, FiVolume2, FiRefreshCw, FiMaximize, FiSquare, FiMove, FiGrid } from 'react-icons/fi';
import MediaLibrary from './MediaLibrary';
import supabase from '../../lib/supabase';
import 'animate.css'; // Importar a biblioteca de animações

// Dimensões fixas para o canvas (resolução padrão do livro)
const CANVAS_WIDTH = 1024;
const CANVAS_HEIGHT = 768;

// Deep clone function to avoid reference issues
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

// Main component wrapped in memo to prevent unnecessary re-renders
const CanvasEditor = React.memo(({ 
  page, 
  onChange,
  selectedElement,
  setSelectedElement,
  onElementChange,
  onPlayAnimation,
  onImageRotate,
  onImageFlip,
  onTextStyleChange,
  onAnimationChange,
  onMoveForward,
  onMoveBackward,
  onImageStyleChange,
  onDuplicateElement,
  onRemoveElement,
  isPreviewMode,
  setIsPreviewMode,
  currentStep,
  setCurrentStep
}) => {
  console.log("CanvasEditor renderizado com página:", page);
  
  // Create a stable identifier for the page
  const pageKey = useRef(page?.id || Date.now().toString());
  // Track last page ID to prevent unnecessary resets
  const lastPageId = useRef(page?.id);
  
  // If page ID changes, update the pageKey ref
  if (page?.id && pageKey.current !== page.id) {
    pageKey.current = page.id;
  }
  
  // Adicionado para escala adaptativa
  const [scale, setScale] = useState(1);
  const [showGrid, setShowGrid] = useState(false);
  const [showRealSizePreview, setShowRealSizePreview] = useState(false);
  const containerRef = useRef(null);
  
  // Remove local background state, use page.background directly
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [mediaSelectionType, setMediaSelectionType] = useState(null);
  const [audioTargetElement, setAudioTargetElement] = useState(null);
  const [editingText, setEditingText] = useState(null);
  const [editingTextValue, setEditingTextValue] = useState('');
  const textInputRef = useRef(null);
  
  // Efeito para calcular a escala do canvas com base no tamanho do contêiner
  useEffect(() => {
    const calculateScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const containerHeight = containerRef.current.clientHeight;
        
        // Calcula a escala mantendo a proporção
        const scaleX = (containerWidth - 40) / CANVAS_WIDTH;
        const scaleY = (containerHeight - 40) / CANVAS_HEIGHT;
        
        // Usa a menor escala para garantir que o canvas caiba completamente
        const newScale = Math.min(scaleX, scaleY, 1); // Limitado a 1 (100%)
        setScale(newScale);
      }
    };
    
    calculateScale();
    
    // Recalcula a escala quando a janela for redimensionada
    window.addEventListener('resize', calculateScale);
    return () => window.removeEventListener('resize', calculateScale);
  }, []);
  
  // Effect to sync with parent component, with debounce for better performance
  const changeTimerRef = useRef(null);
  
  useEffect(() => {
    console.log("CanvasEditor: useEffect [page] acionado");
    // When page prop changes, update local state
    if (page && page.id !== lastPageId.current) {
      console.log('Página mudou! Resetando estado interno...');
      lastPageId.current = page.id;
    }
  }, [page]);
  
  // Notify parent of changes, with debounce to avoid excessive updates
  const notifyChanges = useCallback(() => {
    console.log("CanvasEditor: notifyChanges acionado");
    if (changeTimerRef.current) {
      clearTimeout(changeTimerRef.current);
    }
    
    changeTimerRef.current = setTimeout(() => {
      if (onChange) {
        const updatedPage = {
          ...page,
          id: pageKey.current
        };
        console.log("CanvasEditor: notificando alterações na página");
        onChange(updatedPage);
      }
    }, 300); // 300ms debounce
  }, [onChange, page]);
  
  // Visibility event handlers
  const handleShowMediaLibrary = useCallback((type) => {
    setMediaSelectionType(type);
    setShowMediaLibrary(true);
  }, []);
  
  const handleCloseMediaLibrary = useCallback(() => {
    setShowMediaLibrary(false);
  }, []);
  
  // Element change handler (delegates to parent)
  const handleElementChange = useCallback((id, updates) => {
    if (onElementChange) {
      onElementChange(id, updates);
    }
  }, [onElementChange]);
  
  // Position and size handlers
  const handlePositionChange = useCallback((id, position) => {
    handleElementChange(id, { position });
  }, [handleElementChange]);
  
  const handleSizeChange = useCallback((id, size) => {
    handleElementChange(id, { size });
  }, [handleElementChange]);
  
  const handleTextChange = useCallback((id, content) => {
    handleElementChange(id, { content });
  }, [handleElementChange]);
  
  // Element handlers now just pass through to parent
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
      zIndex: (page.elements?.length || 0) + 1
    };
    
    // Add the new element through parent handler
    const updatedPage = {
      ...page,
      elements: [...(page.elements || []), newElement]
    };
    onChange(updatedPage);
    setSelectedElement(newElement.id);
  }, [page, onChange, setSelectedElement]);
  
  const handleMediaSelected = useCallback((file) => {
    // Use file.url instead of just url
    const url = file.url;
    
    if (mediaSelectionType === 'background') {
      onChange({ ...page, background: url });
      setShowMediaLibrary(false);
      return;
    }
    
    // If adding audio to an existing element
    if (mediaSelectionType === 'elementAudio' && audioTargetElement) {
      handleElementChange(audioTargetElement, { audio: url });
      setAudioTargetElement(null);
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
        zIndex: (page.elements?.length || 0) + 1
      };
      
      // Add the new element through parent handler
      const updatedPage = {
        ...page,
        elements: [...(page.elements || []), newElement]
      };
      onChange(updatedPage);
      setSelectedElement(newElement.id);
    } else if (mediaSelectionType === 'audio') {
      const newElement = {
        id: Date.now().toString(),
        type: 'audio',
        content: url,
        position: { x: 50, y: 50 },
        size: { width: 300, height: 50 },
        animation: '',
        step: 0,
        zIndex: (page.elements?.length || 0) + 1
      };
      
      // Add the new element through parent handler
      const updatedPage = {
        ...page,
        elements: [...(page.elements || []), newElement]
      };
      onChange(updatedPage);
      setSelectedElement(newElement.id);
    }
    
    setShowMediaLibrary(false);
  }, [mediaSelectionType, page, onChange, setSelectedElement, audioTargetElement, handleElementChange]);
  
  // Handle animation preview - delegate to parent
  const handlePlayAnimation = useCallback((id, animation) => {
    if (onPlayAnimation) {
      onPlayAnimation(id, animation);
    }
  }, [onPlayAnimation]);
  
  // Handle showing media library for element audio
  const handleShowElementAudioLibrary = useCallback((elementId) => {
    setAudioTargetElement(elementId);
    setMediaSelectionType('elementAudio');
    setShowMediaLibrary(true);
  }, []);
  
  // Toggle preview mode
  const togglePreviewMode = useCallback(() => {
    if (setIsPreviewMode) {
    setIsPreviewMode(prev => !prev);
    }
    setCurrentStep(0); // Reset to first step when entering/exiting preview
    if (setSelectedElement) {
    setSelectedElement(null); // Deselect when entering/exiting preview
    }
  }, [setIsPreviewMode, setSelectedElement]);

  // Toggle grid visibility
  const toggleGrid = useCallback(() => {
    setShowGrid(prev => !prev);
  }, []);
  
  // Toggle real size preview
  const toggleRealSizePreview = useCallback(() => {
    setShowRealSizePreview(prev => !prev);
  }, []);
  
  // Step navigation
  const goToNextStep = useCallback(() => {
    // Find the maximum step in all elements
    const maxStep = Math.max(...(page.elements || []).map(el => el.step || 0), 0);
    // Only increment if not at the last step
    if (currentStep < maxStep) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, page.elements]);
  
  const goToPreviousStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);
  
  // Sort elements by z-index before rendering
  const sortedElements = [...(page.elements || [])].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
  
  // Filter elements by current step in preview mode
  const visibleElements = isPreviewMode 
    ? sortedElements.filter(el => (el.step || 0) <= currentStep)
    : sortedElements;
  
  const handleStartEditingText = useCallback((element) => {
    setEditingText(element.id);
    setEditingTextValue(element.content === 'Clique para editar' ? '' : element.content);
    
    // Focar no input após renderizar
    setTimeout(() => {
      if (textInputRef.current) {
        textInputRef.current.focus();
      }
    }, 10);
  }, []);

  const handleFinishEditingText = useCallback(() => {
    if (editingText && editingTextValue.trim() !== '') {
      handleTextChange(editingText, editingTextValue);
    }
    setEditingText(null);
    setEditingTextValue('');
  }, [editingText, editingTextValue, handleTextChange]);
  
  return (
    <div className="flex flex-col h-full">
      {/* Barra de ferramentas do editor - Simplificada */}
      <div className="flex items-center justify-between p-2 bg-gray-100 border-b border-gray-300">
        <div className="flex items-center space-x-2">
          <button 
            onClick={toggleGrid} 
            className={`p-2 rounded hover:bg-gray-200 ${showGrid ? 'bg-gray-200 text-blue-600' : ''}`}
            title="Mostrar/ocultar grade"
          >
            <FiGrid />
          </button>
          
          <div className="text-sm text-gray-600">
            Escala: {Math.round(scale * 100)}%
          </div>
        </div>
        
        <button 
          onClick={toggleRealSizePreview} 
          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Ver como ficará no leitor
        </button>
      </div>
      
      {/* Área do editor com escala adaptativa */}
      <div 
        ref={containerRef}
        className="relative flex-grow flex items-center justify-center bg-gray-200 overflow-auto p-5"
      >
        <div 
          className="relative shadow-lg bg-white"
          style={{
            width: `${CANVAS_WIDTH}px`,
            height: `${CANVAS_HEIGHT}px`,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            transition: 'transform 0.2s ease'
          }}
          onClick={() => !isPreviewMode && setSelectedElement(null)}
        >
          {/* Background da página */}
          <div 
            className="absolute inset-0 w-full h-full"
            style={{
              backgroundImage: page.background ? `url(${page.background})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          />
          
          {/* Grade guia (opcional) - Aprimorada com grid 3x3 */}
          {showGrid && !isPreviewMode && (
            <div className="absolute inset-0 pointer-events-none">
              {/* Linhas horizontais - agora com 3 linhas */}
              {[...Array(3)].map((_, i) => (
                <div 
                  key={`h-${i}`} 
                  className="absolute w-full h-px bg-blue-400 opacity-15" 
                  style={{ top: `${(i + 1) * 25}%` }} 
                />
              ))}
              
              {/* Linhas verticais - agora com 3 linhas */}
              {[...Array(3)].map((_, i) => (
                <div 
                  key={`v-${i}`} 
                  className="absolute h-full w-px bg-blue-400 opacity-15" 
                  style={{ left: `${(i + 1) * 25}%` }} 
                />
              ))}
              
              {/* Linhas principais centrais com destaque */}
              <div className="absolute left-0 top-1/2 w-full h-px bg-blue-400 bg-opacity-30" />
              <div className="absolute top-0 left-1/2 h-full w-px bg-blue-400 bg-opacity-30" />
              
              {/* Margem de segurança (10% de cada lado) */}
              <div 
                className="absolute border-2 border-dashed border-red-400 border-opacity-30 pointer-events-none"
                style={{
                  top: '10%',
                  left: '10%',
                  width: '80%',
                  height: '80%'
                }}
              />
            </div>
          )}

          {/* Render all elements */}
          {visibleElements.map(element => (
            <Rnd
              key={element.id}
              default={{
                x: element.position?.x || 0,
                y: element.position?.y || 0,
                width: element.size?.width || 100,
                height: element.type === 'image' 
                  ? element.size?.height || 100 
                  : element.size?.height === 'auto' ? 'auto' : element.size?.height || 'auto'
              }}
              position={{ x: element.position?.x || 0, y: element.position?.y || 0 }}
              size={{ 
                width: element.size?.width || 100, 
                height: element.type === 'image' 
                  ? element.size?.height || 100 
                  : element.size?.height === 'auto' ? 'auto' : element.size?.height || 'auto'
              }}
              onDragStop={(e, d) => {
                handlePositionChange(element.id, { x: d.x, y: d.y });
              }}
              onResizeStop={(e, direction, ref, delta, position) => {
                handleSizeChange(element.id, {
                  width: ref.offsetWidth,
                  height: ref.offsetHeight
                });
                handlePositionChange(element.id, position);
              }}
              onClick={(e) => {
                e.stopPropagation();
                !isPreviewMode && setSelectedElement(element.id);
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                !isPreviewMode && setSelectedElement && setSelectedElement(element.id);
              }}
              enableResizing={!isPreviewMode}
              disableDragging={isPreviewMode}
              className={`${
                selectedElement === element.id && !isPreviewMode 
                  ? 'ring-2 ring-blue-500 shadow-md border border-blue-300' 
                  : 'hover:ring-1 hover:ring-blue-300'
              }`}
              style={{ 
                zIndex: element.zIndex || 1,
                cursor: isPreviewMode ? 'default' : 'move'
              }}
              bounds="parent"
            >
              <div 
                id={`el-${element.id}`} 
                className={`w-full h-full relative ${element.animation ? `animate__animated ${element.animation}` : ''}`}
              >
                {/* Controles inline quando o elemento está selecionado - VERSÃO SIMPLIFICADA */}
                {selectedElement === element.id && !isPreviewMode && (
                  <div className="absolute -top-8 right-0 flex space-x-1 z-50 bg-white/90 rounded-full p-1 shadow-sm">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicateElement(element.id);
                      }} 
                      title="Duplicar"
                      className="p-1 rounded-full hover:bg-blue-100"
                    >
                      <FiCopy className="text-blue-600 hover:text-blue-800" size={14} />
                    </button>
                    
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveForward(element.id);
                      }} 
                      title="Trazer para frente"
                      className="p-1 rounded-full hover:bg-blue-100"
                    >
                      <FiChevronUp className="text-blue-600 hover:text-blue-800" size={14} />
                    </button>
                    
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveBackward(element.id);
                      }} 
                      title="Enviar para trás"
                      className="p-1 rounded-full hover:bg-blue-100"
                    >
                      <FiChevronDown className="text-blue-600 hover:text-blue-800" size={14} />
                    </button>
                    
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onPlayAnimation(element.id, element.animation);
                      }} 
                      title="Testar animação"
                      className="p-1 rounded-full hover:bg-green-100"
                    >
                      <FiPlay className="text-green-600 hover:text-green-800" size={14} />
                    </button>
                    
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShowElementAudioLibrary(element.id);
                      }} 
                      title="Adicionar áudio"
                      className="p-1 rounded-full hover:bg-purple-100"
                    >
                      <FiVolume2 className="text-purple-600 hover:text-purple-800" size={14} />
                    </button>
                    
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveElement(element.id);
                      }} 
                      title="Remover"
                      className="p-1 rounded-full hover:bg-red-100"
                    >
                      <FiTrash2 className="text-red-500 hover:text-red-700" size={14} />
                    </button>
                  </div>
                )}

                {/* Text element - Aprimorado com estilos modernos */}
                {element.type === 'text' && (
                  <div
                    id={`el-${element.id}`}
                    className={`w-full h-full p-1 ${
                      element.animation ? 'animate__animated ' + element.animation : ''
                    }`}
                    style={{
                      position: 'relative',
                      backgroundColor: element.textStyle === 'normal' ? 'transparent' : 'white',
                      border: element.textStyle !== 'normal' ? '2px solid #ddd' : 'none',
                      borderRadius: '8px',
                      ...(element.textStyle === 'speech' && {
                        borderRadius: '8px',
                        padding: '12px',
                        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.08)'
                      }),
                      ...(element.textStyle === 'thought' && {
                        borderRadius: '50%',
                        padding: '12px',
                        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.08)'
                      })
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isPreviewMode) {
                        handleStartEditingText(element);
                      }
                    }}
                  >
                    {editingText === element.id ? (
                      <textarea
                        ref={textInputRef}
                        value={editingTextValue}
                        onChange={(e) => setEditingTextValue(e.target.value)}
                        onBlur={handleFinishEditingText}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.ctrlKey) {
                            handleFinishEditingText();
                          }
                        }}
                        className="w-full h-full resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
                        style={{
                          fontFamily: 'inherit',
                          fontSize: 'inherit',
                          color: 'inherit',
                          lineHeight: 'inherit',
                          textAlign: 'inherit',
                          background: 'transparent',
                          border: 'none'
                        }}
                        placeholder="Digite seu texto aqui"
                        autoFocus
                      />
                    ) : (
                      element.content
                    )}
                    {element.textStyle === 'speech' && !editingText && (
                      <div className="absolute -bottom-4 -left-2 w-4 h-4 bg-white rotate-45 border-b-2 border-r-2 border-gray-300 shadow-sm"></div>
                    )}
                    {element.textStyle === 'thought' && !editingText && (
                      <div className="absolute -bottom-2 -left-2 flex">
                        <div className="w-3 h-3 bg-white rounded-full border border-gray-300 shadow-sm"></div>
                        <div className="w-2 h-2 bg-white rounded-full border border-gray-300 -ml-1 mt-1 shadow-sm"></div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Image element - Aprimorado com estilo moderno */}
                {element.type === 'image' && (
                  <div className="w-full h-full p-1">
                    <div className="w-full h-full rounded overflow-hidden">
                      <img 
                        src={element.content} 
                        alt="Content"
                        className={`w-full h-full ${
                          selectedElement === element.id ? 'ring-2 ring-blue-400 shadow-md' : ''
                        }`}
                        style={{ 
                          pointerEvents: 'none',
                          transform: `
                            rotate(${element.rotation || 0}deg)
                            scaleX(${element.flipH ? -1 : 1})
                            scaleY(${element.flipV ? -1 : 1})
                          `,
                          borderRadius: element.imageStyle?.borderRadius || '8px',
                          border: element.imageStyle?.border || '1px solid #e5e7eb',
                          boxShadow: element.imageStyle?.shadow || '0 2px 8px rgba(0, 0, 0, 0.1)',
                          objectFit: element.imageStyle?.objectFit || 'contain',
                          backgroundColor: 'transparent'
                        }}
                      />
                    </div>
                  </div>
                )}
                
                {/* Audio element - Estilização aprimorada */}
                {element.type === 'audio' && (
                  <div className="w-full h-full bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-2 border border-blue-100 flex flex-col justify-center">
                    <div className="text-center text-xs text-blue-500 mb-1">Áudio</div>
                    <audio 
                      controls 
                      src={element.content} 
                      className="w-full" 
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                )}

                {/* Audio player if element has audio - show always - Estilização aprimorada */}
                {element.audio && (
                  <div 
                    className="absolute top-0 right-0 bg-white/90 p-1 rounded-bl z-10 shadow-sm border border-blue-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-1">
                      <div className="text-xs text-blue-500">🔊</div>
                      <audio 
                        controls 
                        src={element.audio} 
                        className="h-6 w-24" 
                      />
                    </div>
                  </div>
                )}
              </div>
            </Rnd>
          ))}
        </div>
      </div>
      
      {/* Modal de visualização em tamanho real - Aprimorado */}
      {showRealSizePreview && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-lg shadow-2xl overflow-hidden" style={{
            width: `${CANVAS_WIDTH}px`,
            height: `${CANVAS_HEIGHT}px`,
            maxWidth: '90vw',
            maxHeight: '90vh'
          }}>
            {/* Barra do topo com botão para fechar */}
            <div className="absolute top-0 right-0 p-2 z-10">
              <button 
                onClick={toggleRealSizePreview}
                className="bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Indicador de etapas */}
            <div className="absolute top-2 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-medium">
              Etapa {currentStep + 1} de {Math.max(...visibleElements.map(el => el.step || 0), 0) + 1}
            </div>
            
            {/* Adicionar indicador de orientação landscape */}
            <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
              Landscape: {CANVAS_WIDTH}x{CANVAS_HEIGHT}px
            </div>
            
            {/* Background da página */}
            <div 
              className="absolute inset-0 w-full h-full"
              style={{
                backgroundImage: page.background ? `url(${page.background})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              {/* Renderizar somente elementos visíveis */}
              {visibleElements.map(element => (
                <div
                  key={element.id}
                  className={`absolute ${element.animation ? `animate__animated ${element.animation}` : ''}`}
                  style={{
                    left: `${element.position?.x || 0}px`,
                    top: `${element.position?.y || 0}px`,
                    width: `${element.size?.width || 100}px`,
                    height: element.type === 'image' 
                      ? `${element.size?.height || 200}px` 
                      : (element.size?.height === 'auto' ? 'auto' : `${element.size?.height}px`),
                    zIndex: element.zIndex || 1
                  }}
                >
                  {/* Conteúdo do texto */}
                  {element.type === 'text' && (
                    <div
                      className="w-full h-full p-1"
                      style={{
                        backgroundColor: element.textStyle === 'normal' ? 'transparent' : 'white',
                        border: element.textStyle !== 'normal' ? '2px solid #ddd' : 'none',
                        borderRadius: '8px',
                        ...(element.textStyle === 'speech' && {
                          borderRadius: '8px',
                          padding: '12px',
                          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.08)'
                        }),
                        ...(element.textStyle === 'thought' && {
                          borderRadius: '50%',
                          padding: '12px',
                          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.08)'
                        })
                      }}
                    >
                      {element.content}
                      {element.textStyle === 'speech' && (
                        <div className="absolute -bottom-4 -left-2 w-4 h-4 bg-white rotate-45 border-b-2 border-r-2 border-gray-300 shadow-sm"></div>
                      )}
                      {element.textStyle === 'thought' && (
                        <div className="absolute -bottom-2 -left-2 flex">
                          <div className="w-3 h-3 bg-white rounded-full border border-gray-300 shadow-sm"></div>
                          <div className="w-2 h-2 bg-white rounded-full border border-gray-300 -ml-1 mt-1 shadow-sm"></div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Conteúdo da imagem */}
                  {element.type === 'image' && (
                    <div className="w-full h-full">
                      <img 
                        src={element.content} 
                        alt="Content"
                        className="w-full h-full"
                        style={{ 
                          transform: `
                            rotate(${element.rotation || 0}deg)
                            scaleX(${element.flipH ? -1 : 1})
                            scaleY(${element.flipV ? -1 : 1})
                          `,
                          borderRadius: element.imageStyle?.borderRadius || 0,
                          border: element.imageStyle?.border || 'none',
                          boxShadow: element.imageStyle?.shadow || 'none',
                          objectFit: element.imageStyle?.objectFit || 'contain'
                        }}
                      />
                    </div>
                  )}
                  
                  {/* Conteúdo de áudio */}
                  {element.type === 'audio' && (
                    <audio controls src={element.content} className="w-full h-full" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Media Library Modal */}
      {showMediaLibrary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-3/4 h-3/4 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold">
                {mediaSelectionType === 'background' ? 'Selecionar Background' : 
                 mediaSelectionType === 'image' ? 'Selecionar Imagem' : 
                 mediaSelectionType === 'audio' ? 'Selecionar Áudio' : 'Biblioteca de Mídia'}
              </h2>
              <button
                onClick={handleCloseMediaLibrary}
                className="text-gray-500 hover:text-gray-700"
              >
                Fechar
              </button>
            </div>
            
            <div className="flex-grow overflow-auto">
              <MediaLibrary 
                onSelect={handleMediaSelected}
                mediaType={mediaSelectionType}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

CanvasEditor.displayName = 'CanvasEditor';

export default CanvasEditor; 