import { createClient } from '@supabase/supabase-js';

const BUCKET = 'presentations';

function buildAnonClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Configuração do Supabase não encontrada.');
  }
  return createClient(supabaseUrl, supabaseAnonKey);
}

function buildServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return null;
  }
  return createClient(supabaseUrl, serviceKey);
}

async function getUserIdFromRequest(req) {
  const authHeader = (req.headers.authorization || '').trim();
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) {
    throw new Error('Sessão inválida. Faça login novamente.');
  }
  const anon = buildAnonClient();
  const {
    data: { user },
    error,
  } = await anon.auth.getUser(token);
  if (error || !user?.id) {
    throw new Error('Não foi possível validar o usuário. Faça login novamente.');
  }
  return user.id;
}

/** Nome seguro para path no Storage (evita espaços/acentos que às vezes confundem proxy/CDN). */
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
 * Gera URL de upload assinada (service role) para o cliente enviar o .pptx direto ao Storage,
 * sem depender de políticas RLS de INSERT para o utilizador.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido.' });
    return;
  }

  try {
    const userId = await getUserIdFromRequest(req);
    const bookId = String(req.body?.bookId || 'temp-book');
    const fileName = req.body?.fileName || 'import.pptx';
    const safeName = slugPptxFileName(fileName);
    const session = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const storagePath = `${userId}/books/${bookId}/imports/staging/${session}/${safeName}`;

    const admin = buildServiceRoleClient();
    if (!admin) {
      res.status(503).json({
        error:
          'Configure SUPABASE_SERVICE_ROLE_KEY no servidor (Vercel) para importar PPTX sem políticas extras no Storage.',
        code: 'SERVICE_ROLE_MISSING',
      });
      return;
    }

    const { data, error } = await admin.storage
      .from(BUCKET)
      .createSignedUploadUrl(storagePath, { upsert: true });

    if (error || !data?.token || !data?.signedUrl) {
      res.status(400).json({
        error:
          error?.message ||
          'Não foi possível criar URL de upload. Confirme se o bucket "presentations" existe.',
      });
      return;
    }

    res.status(200).json({
      bucket: BUCKET,
      storagePath,
      path: data.path,
      token: data.token,
      signedUrl: data.signedUrl,
    });
  } catch (err) {
    const message =
      err?.message || 'Erro ao preparar upload do PPTX.';
    const status = /login|Sessão|autentica|usuário|Token/i.test(message)
      ? 401
      : 500;
    res.status(status).json({ error: message });
  }
}
