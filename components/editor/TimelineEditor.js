import React from 'react';
import { FiPlay, FiPause } from 'react-icons/fi';
import { Rnd } from 'react-rnd';

const TimelineEditor = ({ elements = [], currentStep = 0, setCurrentStep, onElementStepChange }) => {
  // Agrupar elementos por etapa
  const steps = elements.reduce((acc, el) => {
    const step = el.step || 0;
    if (!acc[step]) acc[step] = [];
    acc[step].push(el);
    return acc;
  }, {});

  const stepKeys = Object.keys(steps).sort((a, b) => parseInt(a) - parseInt(b));

  return (
    <div className="w-full bg-white border-t border-gray-200 p-2 text-sm">
      <div className="flex overflow-x-auto space-x-4 pb-2">
        {stepKeys.map((step, index) => (
          <div
            key={step}
            className={`min-w-[180px] border rounded p-2 cursor-pointer flex flex-col items-center justify-start shadow-sm relative ${
              parseInt(step) === currentStep ? 'bg-blue-100 border-blue-400' : 'bg-gray-50 hover:bg-gray-100'
            }`}
            onClick={() => setCurrentStep(parseInt(step))}
          >
            <div className="font-bold mb-1">Etapa {parseInt(step) + 1}</div>
            <div className="text-xs text-gray-600 mb-2">{steps[step].length} elemento(s)</div>

            <div className="flex flex-col gap-1 w-full">
              {steps[step].map((el) => (
                <div
                  key={el.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('elementId', el.id)}
                  className="bg-white text-xs p-1 rounded border border-gray-300 cursor-move shadow-sm hover:bg-blue-50"
                >
                  {el.type === 'text' ? '📝 Texto' : el.type === 'image' ? '🖼 Imagem' : '🔊 Áudio'}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Área para arrastar elementos para nova etapa */}
        <div
          className="min-w-[120px] bg-gray-100 border-dashed border-2 border-gray-300 rounded flex items-center justify-center text-gray-500 hover:bg-gray-200"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            const elId = e.dataTransfer.getData('elementId');
            const maxStep = stepKeys.length ? Math.max(...stepKeys.map(Number)) : 0;
            if (onElementStepChange) {
              onElementStepChange(elId, maxStep + 1);
            }
          }}
        >
          + Nova Etapa
        </div>
      </div>

      <div className="flex justify-center mt-4 space-x-2">
        <button
          onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
          className="px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
        >
          ◀ Etapa Anterior
        </button>
        <button
          onClick={() => setCurrentStep(prev => prev + 1)}
          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Próxima Etapa ▶
        </button>
      </div>
    </div>
  );
};

export default TimelineEditor;