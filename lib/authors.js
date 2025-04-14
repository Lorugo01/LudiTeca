import supabase from './supabase';

// Função para obter todos os autores
export const getAuthors = async () => {
  const { data, error } = await supabase
    .from('authors')
    .select('*')
    .order('name', { ascending: true });
  
  return { data, error };
};

// Função para obter um autor específico
export const getAuthor = async (id) => {
  const { data, error } = await supabase
    .from('authors')
    .select('*')
    .eq('id', id)
    .single();
  
  return { data, error };
};

// Função para criar um novo autor
export const createAuthor = async (authorData) => {
  // Validação básica
  if (!authorData.name) {
    return { 
      data: null, 
      error: { message: 'O nome do autor é obrigatório' } 
    };
  }
  
  // Garantir que created_at existe
  if (!authorData.created_at) {
    authorData.created_at = new Date().toISOString();
  }
  
  const { data, error } = await supabase
    .from('authors')
    .insert(authorData)
    .select()
    .single();
  
  return { data, error };
};

// Função para atualizar um autor existente
export const updateAuthor = async (id, authorData) => {
  const { data, error } = await supabase
    .from('authors')
    .update(authorData)
    .eq('id', id)
    .select()
    .single();
  
  return { data, error };
};

// Função para excluir um autor
export const deleteAuthor = async (id) => {
  const { error } = await supabase
    .from('authors')
    .delete()
    .eq('id', id);
  
  return { error };
}; 