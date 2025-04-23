import supabase, { sanitizeNumericFields } from './supabase';

// Função para obter todas as categorias
export const getCategories = async () => {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name', { ascending: true });
  
  return { data, error };
};

// Função para obter uma categoria específica
export const getCategory = async (id) => {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('id', id)
    .single();
  
  return { data, error };
};

// Função para criar uma nova categoria
export const createCategory = async (categoryData) => {
  // Validação básica
  if (!categoryData.name) {
    return { 
      data: null, 
      error: { message: 'O nome da categoria é obrigatório' } 
    };
  }
  
  // Garantir que created_at existe
  if (!categoryData.created_at) {
    categoryData.created_at = new Date().toISOString();
  }
  
  const { data, error } = await supabase
    .from('categories')
    .insert(categoryData)
    .select()
    .single();
  
  return { data, error };
};

// Função para atualizar uma categoria existente
export const updateCategory = async (id, categoryData) => {
  // Sanitizar campos numéricos
  const sanitizedData = sanitizeNumericFields(categoryData);
  
  const { data, error } = await supabase
    .from('categories')
    .update(sanitizedData)
    .eq('id', id)
    .select()
    .single();
  
  return { data, error };
};

// Função para excluir uma categoria
export const deleteCategory = async (id) => {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id);
  
  return { error };
}; 