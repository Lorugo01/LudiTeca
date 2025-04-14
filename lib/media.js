import supabase from './supabase';
import { getFileUrl } from './supabase';

// Função para listar arquivos de áudio do bucket 'audios'
export const listAudios = async (path = '') => {
  try {
    const { data, error } = await supabase.storage
      .from('audios')
      .list(path, {
        sortBy: { column: 'name', order: 'asc' }
      });
    
    if (error) throw error;
    
    // Processar os dados para adicionar URLs públicas
    const processedFiles = data.map(file => {
      const filePath = path ? `${path}/${file.name}` : file.name;
      const url = getFileUrl('audios', filePath);
      
      return {
        ...file,
        path: filePath,
        url
      };
    });
    
    return { data: processedFiles, error: null };
  } catch (error) {
    console.error('Erro ao listar arquivos de áudio:', error);
    return { data: null, error };
  }
};

// Função para listar arquivos de imagem do bucket 'covers'
export const listCovers = async (path = '') => {
  try {
    const { data, error } = await supabase.storage
      .from('covers')
      .list(path, {
        sortBy: { column: 'name', order: 'asc' }
      });
    
    if (error) throw error;
    
    // Processar os dados para adicionar URLs públicas
    const processedFiles = data.map(file => {
      const filePath = path ? `${path}/${file.name}` : file.name;
      const url = getFileUrl('covers', filePath);
      
      return {
        ...file,
        path: filePath,
        url
      };
    });
    
    return { data: processedFiles, error: null };
  } catch (error) {
    console.error('Erro ao listar capas:', error);
    return { data: null, error };
  }
};

// Função para listar arquivos de páginas do bucket 'pages'
export const listPages = async (path = '') => {
  try {
    const { data, error } = await supabase.storage
      .from('pages')
      .list(path, {
        sortBy: { column: 'name', order: 'asc' }
      });
    
    if (error) throw error;
    
    // Processar os dados para adicionar URLs públicas
    const processedFiles = data.map(file => {
      const filePath = path ? `${path}/${file.name}` : file.name;
      const url = getFileUrl('pages', filePath);
      
      return {
        ...file,
        path: filePath,
        url
      };
    });
    
    return { data: processedFiles, error: null };
  } catch (error) {
    console.error('Erro ao listar páginas:', error);
    return { data: null, error };
  }
};

// Função para fazer upload de um arquivo de áudio
export const uploadAudio = async (file, path) => {
  try {
    const { data, error } = await supabase.storage
      .from('audios')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true
      });
    
    if (error) throw error;
    
    const url = getFileUrl('audios', path);
    
    return { data: { ...data, url }, error: null };
  } catch (error) {
    console.error('Erro ao fazer upload de áudio:', error);
    return { data: null, error };
  }
};

// Função para fazer upload de uma imagem de capa
export const uploadCover = async (file, path) => {
  try {
    const { data, error } = await supabase.storage
      .from('covers')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true
      });
    
    if (error) throw error;
    
    const url = getFileUrl('covers', path);
    
    return { data: { ...data, url }, error: null };
  } catch (error) {
    console.error('Erro ao fazer upload de capa:', error);
    return { data: null, error };
  }
};

// Função para fazer upload de uma imagem de página
export const uploadPage = async (file, path) => {
  try {
    const { data, error } = await supabase.storage
      .from('pages')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true
      });
    
    if (error) throw error;
    
    const url = getFileUrl('pages', path);
    
    return { data: { ...data, url }, error: null };
  } catch (error) {
    console.error('Erro ao fazer upload de página:', error);
    return { data: null, error };
  }
};

// Função para excluir um arquivo de áudio
export const deleteAudio = async (path) => {
  try {
    const { data, error } = await supabase.storage
      .from('audios')
      .remove([path]);
    
    if (error) throw error;
    
    return { data, error: null };
  } catch (error) {
    console.error('Erro ao excluir áudio:', error);
    return { data: null, error };
  }
};

// Função para excluir uma imagem de capa
export const deleteCover = async (path) => {
  try {
    const { data, error } = await supabase.storage
      .from('covers')
      .remove([path]);
    
    if (error) throw error;
    
    return { data, error: null };
  } catch (error) {
    console.error('Erro ao excluir capa:', error);
    return { data: null, error };
  }
};

// Função para excluir uma imagem de página
export const deletePage = async (path) => {
  try {
    const { data, error } = await supabase.storage
      .from('pages')
      .remove([path]);
    
    if (error) throw error;
    
    return { data, error: null };
  } catch (error) {
    console.error('Erro ao excluir página:', error);
    return { data: null, error };
  }
}; 