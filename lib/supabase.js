import { createClient } from '@supabase/supabase-js';

// Cria uma instância do cliente Supabase usando as variáveis de ambiente
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Exporta o cliente para uso em outros arquivos
export default supabase;

// Autenticação
export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) return { error };
  return { user: data.user, session: data.session, error: null };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getCurrentUser = async () => {
  const { data, error } = await supabase.auth.getUser();
  
  if (error) return { error };
  if (!data.user) return { user: null, error: null };
  
  return { user: data.user, error: null };
};

// Funções para manipulação de arquivos no Storage
export async function uploadFile(bucketName, filePath, file, options = {}) {
  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
        ...options
      });

    if (error) throw error;

    // Obter URL pública do arquivo
    const { data: urlData } = await supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return { ...data, url: urlData.publicUrl };
  } catch (error) {
    console.error('Erro ao fazer upload:', error);
    throw error;
  }
}

export async function listFiles(bucketName, folderPath = '') {
  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .list(folderPath, {
        sortBy: { column: 'name', order: 'asc' }
      });

    if (error) throw error;

    // Processar arquivos para adicionar informações úteis
    const processedFiles = await Promise.all(data.map(async (item) => {
      const isFolder = !item.id;
      const path = folderPath ? `${folderPath}/${item.name}` : item.name;
      
      // Determinar o tipo de arquivo pela extensão
      let type = 'other';
      if (!isFolder) {
        const extension = item.name.split('.').pop()?.toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(extension)) {
          type = 'image';
        } else if (['mp3', 'wav', 'ogg', 'm4a'].includes(extension)) {
          type = 'audio';
        } else if (['mp4', 'webm', 'mov'].includes(extension)) {
          type = 'video';
        } else if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt'].includes(extension)) {
          type = 'document';
        }
      }

      // Obter URL pública para imagens
      let url = null;
      if (type === 'image') {
        const { data: urlData } = await supabase.storage
          .from(bucketName)
          .getPublicUrl(path);
        url = urlData.publicUrl;
      }

      return {
        ...item,
        path,
        type,
        isFolder,
        url
      };
    }));

    return processedFiles;
  } catch (error) {
    console.error('Erro ao listar arquivos:', error);
    throw error;
  }
}

export async function deleteFile(bucketName, filePath) {
  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .remove([filePath]);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao excluir arquivo:', error);
    throw error;
  }
}

export async function createFolder(bucketName, folderPath) {
  try {
    // Para criar uma pasta no Supabase Storage, criamos um arquivo vazio com nome .folder
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(`${folderPath}/.folder`, new Blob(['']), {
        contentType: 'application/json',
        upsert: true
      });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao criar pasta:', error);
    throw error;
  }
}

// Funções para manipulação de livros
export const getBooks = async () => {
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .order('created_at', { ascending: false });
  
  return { data, error };
};

export const getBook = async (id) => {
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .eq('id', id)
    .single();
  
  return { data, error };
};

export const createBook = async (bookData) => {
  const { data, error } = await supabase
    .from('books')
    .insert(bookData)
    .select()
    .single();
  
  return { data, error };
};

export const updateBook = async (id, bookData) => {
  const { data, error } = await supabase
    .from('books')
    .update(bookData)
    .eq('id', id)
    .select()
    .single();
  
  return { data, error };
};

export const deleteBook = async (id) => {
  const { error } = await supabase
    .from('books')
    .delete()
    .eq('id', id);
  
  return { error };
};

// Funções para manipulação de autores
export const getAuthors = async () => {
  const { data, error } = await supabase
    .from('authors')
    .select('*')
    .order('name', { ascending: true });
  
  return { data, error };
};

export const getAuthor = async (id) => {
  const { data, error } = await supabase
    .from('authors')
    .select('*')
    .eq('id', id)
    .single();
  
  return { data, error };
};

export const createAuthor = async (authorData) => {
  const { data, error } = await supabase
    .from('authors')
    .insert(authorData)
    .select()
    .single();
  
  return { data, error };
};

export const updateAuthor = async (id, authorData) => {
  const { data, error } = await supabase
    .from('authors')
    .update(authorData)
    .eq('id', id)
    .select()
    .single();
  
  return { data, error };
};

export const deleteAuthor = async (id) => {
  const { error } = await supabase
    .from('authors')
    .delete()
    .eq('id', id);
  
  return { error };
};

// Funções para manipulação de categorias
export const getCategories = async () => {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name', { ascending: true });
  
  return { data, error };
};

export const getCategory = async (id) => {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('id', id)
    .single();
  
  return { data, error };
};

export const createCategory = async (categoryData) => {
  const { data, error } = await supabase
    .from('categories')
    .insert(categoryData)
    .select()
    .single();
  
  return { data, error };
};

export const updateCategory = async (id, categoryData) => {
  const { data, error } = await supabase
    .from('categories')
    .update(categoryData)
    .eq('id', id)
    .select()
    .single();
  
  return { data, error };
};

export const deleteCategory = async (id) => {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id);
  
  return { error };
};

// Função para obter URL pública de um arquivo
export const getFileUrl = (bucket, path) => {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);
  
  return data?.publicUrl || null;
};

// Função utilitária para converter strings vazias em null para campos numéricos
export function sanitizeNumericFields(data, fieldNames = []) {
  if (!data || typeof data !== 'object') return data;
  
  const sanitized = { ...data };
  
  // Lista de campos comuns que são numéricos nas tabelas
  const defaultNumericFields = [
    'id', 'author_id', 'category_id', 'order', 'position', 
    'parent_id', 'zIndex', 'step', 'width', 'height', 
    'x', 'y', 'size', 'rotation'
  ];
  
  // Combinar campos padrão com os campos específicos passados
  const fieldsToCheck = [...defaultNumericFields, ...fieldNames];
  
  // Verificar campos no nível superior
  fieldsToCheck.forEach(field => {
    if (sanitized[field] === '') {
      sanitized[field] = null;
    }
  });
  
  // Verificar arrays aninhados (como pages e elements)
  Object.keys(sanitized).forEach(key => {
    // Verificar arrays
    if (Array.isArray(sanitized[key])) {
      sanitized[key] = sanitized[key].map(item => {
        if (typeof item === 'object' && item !== null) {
          return sanitizeNumericFields(item, fieldNames);
        }
        return item;
      });
    } 
    // Verificar objetos aninhados
    else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeNumericFields(sanitized[key], fieldNames);
    }
  });
  
  return sanitized;
} 