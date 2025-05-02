import React, { useState } from 'react';
import { 
  FiPlay, 
  FiCopy, 
  FiChevronUp, 
  FiChevronDown, 
  FiTrash2,
  FiMoreVertical
} from 'react-icons/fi';

const AVAILABLE_FONTS = [
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Raleway', label: 'Raleway' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Patrick Hand', label: 'Patrick Hand' },
  { value: 'Open Sans', label: 'Open Sans' },
  { value: 'Nunito', label: 'Nunito' },
  { value: 'Merriweather', label: 'Merriweather' },
  { value: 'Dosis', label: 'Dosis' },
  { value: 'Comic Neue', label: 'Comic Neue' },
  { value: 'Comic Neue Sans', label: 'Comic Neue Sans' }
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
          value={element.fontFamily || 'Roboto'}
          onChange={(e) => {
            e.stopPropagation();
            handleElementChange(element.id, { fontFamily: e.target.value });
          }}
          className="p-1 rounded-full hover:bg-blue-100 text-sm min-w-[120px]"
          style={{ fontFamily: element.fontFamily || 'Roboto' }}
        >
          {AVAILABLE_FONTS.map(font => (
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
            handleElementChange(element.id, { fontSize: parseInt(e.target.value) });
          }}
          className="p-1 rounded-full hover:bg-blue-100 text-sm w-[60px]"
        >
          {[12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 64].map(size => (
            <option key={size} value={size}>{size}</option>
          ))}
        </select>

        {/* Bold */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            const newWeight = element.fontWeight === 'bold' ? 'normal' : 'bold';
            handleElementChange(element.id, { fontWeight: newWeight });
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
            handleElementChange(element.id, { fontStyle: newStyle });
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
            handleElementChange(element.id, { color: e.target.value });
          }}
          className="w-6 h-6 p-0 border-none rounded cursor-pointer"
          title="Cor do texto"
        />

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