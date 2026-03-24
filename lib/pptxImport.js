import supabase from './supabase';

async function resolveAccessToken() {
  const { data: first } = await supabase.auth.getSession();
  if (first?.session?.access_token) {
    return first.session.access_token;
  }
  const { data: refreshed, error } = await supabase.auth.refreshSession();
  if (error || !refreshed?.session?.access_token) {
    throw new Error(
      'Sessão não encontrada ou expirada. Atualize a página e faça login novamente.',
    );
  }
  return refreshed.session.access_token;
}

/**
 * Importa PPTX via API. Usa XMLHttpRequest para expor progresso de upload (e, quando possível, da resposta).
 *
 * @param {object} opts
 * @param {string} opts.bookId
 * @param {string} opts.userId
 * @param {File} opts.file
 * @param {(info: { phase: string, percent: number|null, message: string }) => void} [opts.onProgress]
 */
export function importPptxForBook({ bookId, userId, file, onProgress }) {
  if (!bookId) {
    return Promise.reject(new Error('Livro inválido para importação.'));
  }

  if (!userId) {
    return Promise.reject(new Error('Usuário inválido para importação.'));
  }

  if (!file) {
    return Promise.reject(new Error('Selecione um arquivo .pptx.'));
  }

  const fileName = file.name?.toLowerCase?.() || '';
  if (!fileName.endsWith('.pptx')) {
    return Promise.reject(new Error('Somente arquivos .pptx são aceitos.'));
  }

  const maxSizeBytes = 500 * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return Promise.reject(
      new Error('Arquivo muito grande. Limite de 500MB por importação.'),
    );
  }

  const timeoutMs = 45 * 60 * 1000;

  return new Promise((resolve, reject) => {
    let settled = false;
    const safeProgress = (info) => {
      try {
        onProgress?.(info);
      } catch {
        /* ignore */
      }
    };

    resolveAccessToken()
      .then((accessToken) => {
        const xhr = new XMLHttpRequest();
        const formData = new FormData();
        formData.append('file', file);
        formData.append('bookId', String(bookId));
        formData.append('userId', String(userId));

        const timeoutId = setTimeout(() => {
          xhr.abort();
        }, timeoutMs);

        const finish = (fn, arg) => {
          if (settled) return;
          settled = true;
          clearTimeout(timeoutId);
          fn(arg);
        };

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable && file.size > 0) {
            const pct = Math.min(
              99,
              Math.round((e.loaded / e.total) * 100),
            );
            safeProgress({
              phase: 'upload',
              percent: pct,
              message: `Enviando arquivo… (${formatBytes(e.loaded)} / ${formatBytes(e.total)})`,
            });
          } else {
            safeProgress({
              phase: 'upload',
              percent: null,
              message: 'Enviando arquivo…',
            });
          }
        });

        xhr.upload.addEventListener('loadend', () => {
          safeProgress({
            phase: 'processing',
            percent: null,
            message:
              'Arquivo enviado. Processando slides no servidor (pode demorar)…',
          });
        });

        xhr.addEventListener('progress', (e) => {
          if (e.lengthComputable && e.total > 0) {
            const pct = Math.min(
              99,
              Math.round((e.loaded / e.total) * 100),
            );
            safeProgress({
              phase: 'processing',
              percent: pct,
              message: 'Recebendo resposta do servidor…',
            });
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            let payload;
            try {
              payload = JSON.parse(xhr.responseText || '{}');
            } catch {
              finish(reject, new Error('Resposta inválida do servidor.'));
              return;
            }
            safeProgress({
              phase: 'done',
              percent: 100,
              message: 'Importação concluída.',
            });
            finish(resolve, payload);
            return;
          }

          let errorMessage = 'Falha ao importar o arquivo PPTX.';
          try {
            const j = JSON.parse(xhr.responseText || '{}');
            if (j?.error) errorMessage = j.error;
          } catch {
            /* ignore */
          }
          finish(reject, new Error(errorMessage));
        });

        xhr.addEventListener('error', () => {
          finish(reject, new Error('Erro de rede ao importar o PPTX.'));
        });

        xhr.addEventListener('abort', () => {
          finish(
            reject,
            new Error(
              'Tempo esgotado ou importação cancelada. Tente novamente com um arquivo menor ou verifique a conexão.',
            ),
          );
        });

        safeProgress({
          phase: 'upload',
          percent: 0,
          message: 'Preparando envio…',
        });

        xhr.open('POST', '/api/books/import-pptx');
        xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
        xhr.send(formData);
      })
      .catch((err) => {
        finish(reject, err instanceof Error ? err : new Error(String(err)));
      });
  });
}

function formatBytes(n) {
  if (n == null || Number.isNaN(n)) return '?';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
