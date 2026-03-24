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

const PPTX_STAGING_BUCKET = 'presentations';

function sanitizePptxFileName(name) {
  const raw = (name || 'import.pptx').replace(/[/\\?*:|"<>]/g, '_').trim();
  const base = raw.slice(-180) || 'import.pptx';
  return base.toLowerCase().endsWith('.pptx') ? base : `${base}.pptx`;
}

/**
 * Envia o .pptx direto ao Supabase Storage e devolve o caminho (evita limite de corpo na Vercel, ex.: 413).
 */
async function uploadPptxToStaging({ userId, bookId, file, onProgress }) {
  const safeProgress = (info) => {
    try {
      onProgress?.(info);
    } catch {
      /* ignore */
    }
  };

  const importSessionId = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const safeName = sanitizePptxFileName(file.name);
  const storagePath = `${userId}/books/${bookId}/imports/staging/${importSessionId}/${safeName}`;

  safeProgress({
    phase: 'upload',
    percent: null,
    message:
      'Enviando arquivo para o armazenamento (Supabase). Isso contorna o limite de tamanho do servidor na Vercel…',
  });

  const { error: uploadError } = await supabase.storage
    .from(PPTX_STAGING_BUCKET)
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: true,
      contentType:
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    });

  if (uploadError) {
    throw new Error(
      uploadError.message ||
        'Falha ao enviar o arquivo para o armazenamento. Verifique as permissões do bucket "presentations".',
    );
  }

  return { storagePath, bucket: PPTX_STAGING_BUCKET };
}

function runImportXhr({ accessToken, formData, jsonBody, onProgress, timeoutMs }) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const safeProgress = (info) => {
      try {
        onProgress?.(info);
      } catch {
        /* ignore */
      }
    };

    const xhr = new XMLHttpRequest();
    const timeoutId = setTimeout(() => {
      xhr.abort();
    }, timeoutMs);

    const finish = (fn, arg) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      fn(arg);
    };

    if (formData) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && e.total > 0) {
          const pct = Math.min(99, Math.round((e.loaded / e.total) * 100));
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
    } else {
      safeProgress({
        phase: 'processing',
        percent: null,
        message: 'Processando slides no servidor (pode demorar)…',
      });
    }

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
      if (xhr.status === 413) {
        finish(
          reject,
          new Error(
            'Arquivo maior que o limite do servidor. O envio deveria ir ao Supabase primeiro — atualize o CMS ou limpe o cache.',
          ),
        );
        return;
      }
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

    xhr.open('POST', '/api/books/import-pptx');
    xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
    if (jsonBody) {
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.send(JSON.stringify(jsonBody));
    } else {
      xhr.send(formData);
    }
  });
}

/**
 * Importa PPTX: envia o arquivo ao Supabase Storage e chama a API só com o caminho (compatível com Vercel).
 *
 * @param {object} opts
 * @param {string} opts.bookId
 * @param {string} opts.userId
 * @param {File} opts.file
 * @param {(info: { phase: string, percent: number|null, message: string }) => void} [opts.onProgress]
 * @param {boolean} [opts.forceMultipart] — só para testes locais; envia o arquivo no POST (pode dar 413 na Vercel).
 */
export function importPptxForBook({
  bookId,
  userId,
  file,
  onProgress,
  forceMultipart = false,
}) {
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

  return (async () => {
    const accessToken = await resolveAccessToken();

    if (forceMultipart) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bookId', String(bookId));
      formData.append('userId', String(userId));
      onProgress?.({
        phase: 'upload',
        percent: 0,
        message: 'Preparando envio (multipart)…',
      });
      return runImportXhr({
        accessToken,
        formData,
        jsonBody: null,
        onProgress,
        timeoutMs,
      });
    }

    const { storagePath, bucket } = await uploadPptxToStaging({
      userId,
      bookId,
      file,
      onProgress,
    });

    return runImportXhr({
      accessToken,
      formData: null,
      jsonBody: {
        bookId: String(bookId),
        storagePath,
        bucket,
      },
      onProgress,
      timeoutMs,
    });
  })();
}

function formatBytes(n) {
  if (n == null || Number.isNaN(n)) return '?';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
