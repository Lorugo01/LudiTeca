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

/** Mesma regra que em `pptx-staging-signed-url.js` (path estável no Storage). */
function slugPptxFileName(original) {
  let base = String(original || 'import.pptx');
  if (base.toLowerCase().endsWith('.pptx')) {
    base = base.slice(0, -5);
  }
  const slug = base
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100) || 'import';
  return `${slug}.pptx`;
}

/**
 * Upload direto com sessão do utilizador (exige políticas RLS no bucket).
 */
async function uploadPptxDirectToSupabase({ userId, bookId, file, onProgress }) {
  const safeProgress = (info) => {
    try {
      onProgress?.(info);
    } catch {
      /* ignore */
    }
  };

  const importSessionId = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const safeName = slugPptxFileName(file.name);
  const storagePath = `${userId}/books/${bookId}/imports/staging/${importSessionId}/${safeName}`;

  safeProgress({ phase: 'upload', percent: null, message: 'Enviando…' });

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
        'Falha no upload. Defina SUPABASE_SERVICE_ROLE_KEY na Vercel ou ajuste as políticas do bucket "presentations".',
    );
  }

  return { storagePath, bucket: PPTX_STAGING_BUCKET };
}

/**
 * Preferência: URL assinada (service role no servidor) → upload sem RLS no cliente.
 */
async function uploadPptxToStaging({ userId, bookId, file, onProgress }) {
  const safeProgress = (info) => {
    try {
      onProgress?.(info);
    } catch {
      /* ignore */
    }
  };

  safeProgress({ phase: 'upload', percent: null, message: 'Enviando…' });

  const accessToken = await resolveAccessToken();

  const signRes = await fetch('/api/books/pptx-staging-signed-url', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      bookId: String(bookId),
      fileName: file.name || 'import.pptx',
    }),
  });

  let signJson = {};
  try {
    signJson = await signRes.json();
  } catch {
    signJson = {};
  }

  if (!signRes.ok) {
    if (signJson.code === 'SERVICE_ROLE_MISSING') {
      return uploadPptxDirectToSupabase({ userId, bookId, file, onProgress });
    }
    throw new Error(
      signJson.error ||
        `Não foi possível preparar o upload (${signRes.status}).`,
    );
  }

  const { bucket, storagePath, path, token } = signJson;
  if (!bucket || !storagePath || !path || !token) {
    throw new Error('Resposta inválida ao preparar o upload.');
  }

  const { error: signedErr } = await supabase.storage
    .from(bucket)
    .uploadToSignedUrl(path, token, file, {
      upsert: true,
      contentType:
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      cacheControl: '3600',
    });

  if (signedErr) {
    throw new Error(
      signedErr.message ||
        'Falha ao enviar o arquivo. Verifique o bucket e a service role.',
    );
  }

  return { storagePath, bucket };
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
            message: `${pct}%`,
          });
        } else {
          safeProgress({
            phase: 'upload',
            percent: null,
            message: 'Enviando…',
          });
        }
      });

      xhr.upload.addEventListener('loadend', () => {
        safeProgress({
          phase: 'processing',
          percent: null,
          message: 'Processando…',
        });
      });
    } else {
      safeProgress({
        phase: 'processing',
        percent: null,
        message: 'Processando…',
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
          message: `${pct}%`,
        });
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status === 413) {
        finish(
          reject,
          new Error(
            'Arquivo maior que o limite do servidor. Atualize o CMS para envio via Storage.',
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
          message: '100%',
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
          'Tempo esgotado ou importação cancelada. Tente de novo ou use um arquivo menor.',
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
 * Importa PPTX: envia ao Storage (URL assinada ou direto) e processa na API com JSON pequeno.
 *
 * @param {boolean} [opts.forceMultipart] — testes locais; pode dar 413 na Vercel.
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
        message: '0%',
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
