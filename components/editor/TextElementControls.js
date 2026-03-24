import React, { useState } from 'react';
import { 
  FiPlay, 
  FiCopy, 
  FiChevronUp, 
  FiChevronDown, 
  FiTrash2,
  FiMoreVertical,
  FiAlignLeft,
  FiAlignCenter,
  FiAlignRight
} from 'react-icons/fi';

const AVAILABLE_FONTS = [
  { value: 'Century Gothic', label: 'Century Gothic' },
  { value: 'Calibri', label: 'Calibri' },
  { value: 'Arial', label: 'Arial' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Verdana', label: 'Verdana' },
  { value: 'Tahoma', label: 'Tahoma' },
  { value: 'Trebuchet MS', label: 'Trebuchet MS' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Garamond', label: 'Garamond' },
  { value: 'Cambria', label: 'Cambria' },
  { value: 'Segoe UI', label: 'Segoe UI' },
  { value: 'Impact', label: 'Impact' },
  { value: 'Courier New', label: 'Courier New' },
  { value: 'Lucida Sans Unicode', label: 'Lucida Sans Unicode' },
  { value: 'Palatino Linotype', label: 'Palatino Linotype' },
  { value: 'Book Antiqua', label: 'Book Antiqua' },
  { value: 'Arial Black', label: 'Arial Black' },
  { value: 'Comic Sans MS', label: 'Comic Sans MS' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Open Sans', label: 'Open Sans' },
  { value: 'Nunito', label: 'Nunito' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Merriweather', label: 'Merriweather' },
];

const TextElementControls = ({
  element,
  onPlayAnimation,
  handleElementChange,
  onDuplicateElement,
  onMoveForward,
  onMoveBackward,
  onRemoveElement
}) => {
  const [showSecondaryMenu, setShowSecondaryMenu] = useState(false);
  const currentFont = element.fontFamily || 'Roboto';
  const fontOptions = AVAILABLE_FONTS.some((f) => f.value === currentFont)
    ? AVAILABLE_FONTS
    : [{ value: currentFont, label: `${currentFont} (importada)` }, ...AVAILABLE_FONTS];
  const updateText = (payload) => {
    handleElementChange(element.id, {
      ...payload,
      contentSpans: undefined,
    });
  };

  return (
    <>
      {/* Menu Principal - Formatação de Texto */}
      <div className="absolute -top-12 left-0 flex space-x-1 z-50 bg-white/90 rounded-full p-1 shadow-sm">
        {/* Play Animation */}
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

        {/* Font Family */}
        <select
          value={currentFont}
          onChange={(e) => {
            e.stopPropagation();
            updateText({ fontFamily: e.target.value });
          }}
          className="p-1 rounded-full hover:bg-blue-100 text-sm min-w-[120px]"
          style={{ fontFamily: currentFont }}
        >
          {fontOptions.map(font => (
            <option 
              key={font.value} 
              value={font.value}
              style={{ fontFamily: font.value }}
            >
              {font.label}
            </option>
          ))}
        </select>

        {/* Font Size */}
        <select
          value={element.fontSize || 16}
          onChange={(e) => {
            e.stopPropagation();
            updateText({ fontSize: parseInt(e.target.value, 10) });
          }}
          className="p-1 rounded-full hover:bg-blue-100 text-sm w-[60px]"
        >
          {[10, 11, 12, 14, 16, 18, 20, 22, 24, 28, 32, 36, 40, 44, 48, 54, 64, 72].map(size => (
            <option key={size} value={size}>{size}</option>
          ))}
        </select>

        {/* Bold */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            const newWeight = element.fontWeight === 'bold' ? 'normal' : 'bold';
            updateText({ fontWeight: newWeight });
          }}
          className={`p-1 rounded-full ${element.fontWeight === 'bold' ? 'bg-blue-200' : 'hover:bg-blue-100'}`}
          title="Negrito"
        >
          <span className="font-bold">B</span>
        </button>

        {/* Italic */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            const newStyle = element.fontStyle === 'italic' ? 'normal' : 'italic';
            updateText({ fontStyle: newStyle });
          }}
          className={`p-1 rounded-full ${element.fontStyle === 'italic' ? 'bg-blue-200' : 'hover:bg-blue-100'}`}
          title="Itálico"
        >
          <span className="italic">I</span>
        </button>

        {/* Color Picker */}
        <input
          type="color"
          value={element.color || '#000000'}
          onChange={(e) => {
            e.stopPropagation();
            updateText({ color: e.target.value });
          }}
          className="w-6 h-6 p-0 border-none rounded cursor-pointer"
          title="Cor do texto"
        />

        {/* Underline */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            const next = element.textDecoration === 'underline' ? 'none' : 'underline';
            updateText({ textDecoration: next });
          }}
          className={`p-1 rounded-full ${element.textDecoration === 'underline' ? 'bg-blue-200' : 'hover:bg-blue-100'}`}
          title="Sublinhado"
        >
          <span className="underline">U</span>
        </button>

        {/* Alignment */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            updateText({ textAlign: 'left' });
          }}
          className={`p-1 rounded-full ${element.textAlign === 'left' || !element.textAlign ? 'bg-blue-200' : 'hover:bg-blue-100'}`}
          title="Alinhar à esquerda"
        >
          <FiAlignLeft size={14} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            updateText({ textAlign: 'center' });
          }}
          className={`p-1 rounded-full ${element.textAlign === 'center' ? 'bg-blue-200' : 'hover:bg-blue-100'}`}
          title="Centralizar"
        >
          <FiAlignCenter size={14} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            updateText({ textAlign: 'right' });
          }}
          className={`p-1 rounded-full ${element.textAlign === 'right' ? 'bg-blue-200' : 'hover:bg-blue-100'}`}
          title="Alinhar à direita"
        >
          <FiAlignRight size={14} />
        </button>

        {/* Botão do Menu Secundário */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowSecondaryMenu(!showSecondaryMenu);
            }}
            className="p-1 rounded-full hover:bg-gray-100"
            title="Mais opções"
          >
            <FiMoreVertical className="text-gray-600 hover:text-gray-800" size={14} />
          </button>

          {/* Menu Secundário Vertical */}
          {showSecondaryMenu && (
            <div 
              className="absolute top-full right-0 mt-1 bg-white rounded-lg shadow-lg py-1 z-50"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-3 py-2 border-b border-gray-100">
                <label className="block text-[11px] text-gray-500 mb-1">Espaçamento de linha</label>
                <select
                  value={element.lineHeight || 1.35}
                  onChange={(e) => {
                    e.stopPropagation();
                    updateText({ lineHeight: parseFloat(e.target.value) });
                  }}
                  className="w-full text-xs border rounded px-2 py-1"
                >
                  {[1, 1.15, 1.35, 1.5, 1.8, 2].map((lh) => (
                    <option key={lh} value={lh}>{lh}x</option>
                  ))}
                </select>
                <label className="block text-[11px] text-gray-500 mt-2 mb-1">Espaçamento entre letras</label>
                <select
                  value={element.letterSpacing ?? 0}
                  onChange={(e) => {
                    e.stopPropagation();
                    updateText({ letterSpacing: parseFloat(e.target.value) });
                  }}
                  className="w-full text-xs border rounded px-2 py-1"
                >
                  {[-1, -0.5, 0, 0.5, 1, 1.5, 2].map((ls) => (
                    <option key={ls} value={ls}>{ls}px</option>
                  ))}
                </select>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicateElement(element.id);
                  setShowSecondaryMenu(false);
                }} 
                className="w-full px-3 py-1 text-left hover:bg-blue-50 flex items-center space-x-2"
              >
                <FiCopy size={14} />
                <span>Duplicar</span>
              </button>
              
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveForward(element.id);
                  setShowSecondaryMenu(false);
                }} 
                className="w-full px-3 py-1 text-left hover:bg-blue-50 flex items-center space-x-2"
              >
                <FiChevronUp size={14} />
              </button>
              
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveBackward(element.id);
                  setShowSecondaryMenu(false);
                }} 
                className="w-full px-3 py-1 text-left hover:bg-blue-50 flex items-center space-x-2"
              >
                <FiChevronDown size={14} />
              </button>
              
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveElement(element.id);
                  setShowSecondaryMenu(false);
                }} 
                className="w-full px-3 py-1 text-left hover:bg-red-50 flex items-center space-x-2 text-red-600"
              >
                <FiTrash2 size={14} />
                <span>Remover</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default TextElementControls; 