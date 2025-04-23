import React from 'react';
import { FiPlay, FiPause, FiSkipBack, FiSkipForward, FiPlus, FiTrash2 } from 'react-icons/fi';

const Timeline = ({
  currentStep,
  maxSteps,
  onStepChange,
  onAddStep,
  onRemoveStep,
  isPlaying,
  onPlayPause,
  onStepBack,
  onStepForward,
  elements,
  onElementSelect
}) => {
  return (
    <div className="bg-gray-800 text-white h-full flex flex-col">
      {/* Controles de reprodução */}
      <div className="p-2 border-b border-gray-700">
        <div className="flex flex-col space-y-2">
          <div className="flex justify-center space-x-2">
            <button
              onClick={onStepBack}
              className="p-2 bg-gray-700 rounded hover:bg-gray-600"
              title="Etapa anterior"
            >
              <FiSkipBack />
            </button>
            
            <button
              onClick={onPlayPause}
              className="p-2 bg-blue-600 rounded hover:bg-blue-500"
              title={isPlaying ? "Pausar" : "Reproduzir"}
            >
              {isPlaying ? <FiPause /> : <FiPlay />}
            </button>
            
            <button
              onClick={onStepForward}
              className="p-2 bg-gray-700 rounded hover:bg-gray-600"
              title="Próxima etapa"
            >
              <FiSkipForward />
            </button>
          </div>
          
          <div className="flex justify-center space-x-2">
            <button
              onClick={onAddStep}
              className="p-2 bg-green-600 rounded hover:bg-green-500"
              title="Adicionar etapa"
            >
              <FiPlus />
            </button>
            
            <button
              onClick={onRemoveStep}
              className="p-2 bg-red-600 rounded hover:bg-red-500"
              title="Remover etapa"
              disabled={maxSteps <= 1}
            >
              <FiTrash2 />
            </button>
          </div>
        </div>
      </div>
      
      {/* Timeline Vertical */}
      <div className="flex-1 relative bg-gray-900 overflow-y-auto p-2">
        <div className="flex flex-col h-full">
          {/* Frames/Etapas */}
          {Array.from({ length: maxSteps + 1 }).map((_, index) => (
            <div
              key={index}
              className={`relative w-full h-24 border-b border-gray-700 ${
                currentStep === index ? 'bg-blue-600' : 'bg-gray-800'
              } mb-2 rounded cursor-pointer transition-colors`}
              onClick={() => onStepChange(index)}
            >
              <div className="absolute inset-0 p-2">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-xs font-medium">Etapa {index}</div>
                  <div className="text-xs text-gray-400">
                    {elements.filter(el => el.step === index).length} elementos
                  </div>
                </div>
                {/* Miniaturas dos elementos nesta etapa */}
                <div className="flex flex-wrap gap-1">
                  {elements
                    .filter(el => el.step === index)
                    .map(el => (
                      <div
                        key={el.id}
                        className="w-6 h-6 rounded bg-gray-600 cursor-pointer hover:bg-gray-500 flex items-center justify-center text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          onElementSelect(el.id);
                        }}
                        title={el.type}
                      >
                        {el.type === 'text' ? 'T' : el.type === 'image' ? 'I' : 'A'}
                      </div>
                    ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Informações da etapa atual */}
      <div className="p-2 border-t border-gray-700 text-sm text-gray-400 text-center">
        Etapa {currentStep} de {maxSteps}
      </div>
    </div>
  );
};

export default Timeline; 