import React, { useEffect, useState } from 'react';

/**
 * Contador de segundos enquanto `active` for true (reinicia ao ativar).
 */
export function useElapsedSeconds(active) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!active) {
      setSeconds(0);
      return undefined;
    }
    const started = Date.now();
    const id = setInterval(() => {
      setSeconds(Math.floor((Date.now() - started) / 1000));
    }, 500);
    return () => clearInterval(id);
  }, [active]);
  return seconds;
}

/**
 * Overlay com barra de progresso (determinada ou indeterminada) + mensagem.
 */
export default function LoadingProgressOverlay({
  title = 'Carregando',
  message = '',
  mode = 'indeterminate',
  percent = 0,
  showElapsed = true,
  active = true,
}) {
  const elapsed = useElapsedSeconds(active && showElapsed);

  if (!active) return null;

  const isDeterminate = mode === 'determinate' && typeof percent === 'number';
  const safePercent = Math.min(100, Math.max(0, percent));

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 backdrop-blur-sm px-4"
      role="alertdialog"
      aria-busy="true"
      aria-live="polite"
      aria-label={title}
    >
      <div className="w-full max-w-md rounded-xl border border-gray-600 bg-gray-800 p-6 shadow-2xl">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {message ? (
          <p className="mt-2 text-sm text-gray-300 leading-relaxed">{message}</p>
        ) : null}

        <div className="mt-5 h-3 w-full overflow-hidden rounded-full bg-gray-700">
          {isDeterminate ? (
            <div
              className="h-full rounded-full bg-blue-500 transition-[width] duration-200 ease-out"
              style={{ width: `${safePercent}%` }}
            />
          ) : (
            <div className="relative h-full w-full overflow-hidden rounded-full">
              <div className="absolute inset-y-0 w-1/3 rounded-full bg-blue-500 animate-bar-indeterminate" />
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
          <span>
            {isDeterminate ? `${Math.round(safePercent)}% concluído` : 'Processando…'}
          </span>
          {showElapsed ? (
            <span title="Tempo decorrido">
              {elapsed}s
            </span>
          ) : null}
        </div>

        <p className="mt-3 text-xs text-gray-500">
          Arquivos grandes podem levar vários minutos. Não feche esta aba.
        </p>
      </div>
    </div>
  );
}
