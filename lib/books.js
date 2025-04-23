import supabase, { sanitizeNumericFields } from './supabase';

// Função para obter todos os livros
export const getBooks = async () => {
  const { data, error } = await supabase
    .from('books')
    .select(`
      *,
      authors:author_id (id, name)
    `)
    .order('created_at', { ascending: false });
  
  return { data, error };
};

// Função para obter um livro específico
export const getBook = async (id) => {
  const { data, error } = await supabase
    .from('books')
    .select(`
      *,
      authors:author_id (id, name)
    `)
    .eq('id', id)
    .single();
  
  return { data, error };
};

// Função para criar um novo livro
export const createBook = async (bookData) => {
  console.log('Enviando dados para o Supabase:', bookData);
  
  try {
    // Validação básica
    if (!bookData.title) {
      return { 
        data: null, 
        error: { message: 'O título do livro é obrigatório' } 
      };
    }
    
    // Verifica se "pages" existe e é um array
    if (!bookData.pages || !Array.isArray(bookData.pages)) {
      bookData.pages = [{
        id: Date.now().toString(),
        background: '',
        elements: [],
        orientation: 'portrait'
      }];
    }
    
    // Garantir que created_at existe
    if (!bookData.created_at) {
      bookData.created_at = new Date().toISOString();
    }
    
    // Criação do livro no Supabase
    const { data, error } = await supabase
      .from('books')
      .insert(bookData)
      .select()
      .single();
    
    if (error) {
      console.error('Erro do Supabase ao criar livro:', error);
      return { data: null, error };
    }
    
    console.log('Livro criado com sucesso:', data);
    return { data, error: null };
  } catch (error) {
    console.error('Exceção ao criar livro:', error);
    return { 
      data: null, 
      error: { message: 'Erro interno ao criar livro' } 
    };
  }
};

// Função para atualizar um livro existente
export const updateBook = async (id, bookData) => {
  try {
    console.log(`Iniciando updateBook para ID ${id}, tamanho dos dados: ${JSON.stringify(bookData).length} bytes`);
    
    // Limpar campos que não são colunas reais na tabela books
    // Cria uma cópia limpa de bookData
    const cleanBookData = { ...bookData };
    
    // Remover campos que podem vir de JOINs
    if (cleanBookData.authors) delete cleanBookData.authors;
    
    // Garantir que campos numéricos não sejam strings vazias
    const sanitizedData = sanitizeNumericFields(cleanBookData);
    
    // Verificar se dados não são muito grandes
    const dataSize = new Blob([JSON.stringify(sanitizedData)]).size;
    console.log(`Tamanho total dos dados limpos: ${dataSize} bytes`);
    
    if (dataSize > 1000000) { // ~1MB (limite do Supabase para colunas JSON)
      console.error("ERRO: Dados muito grandes para salvar", dataSize);
      return { 
        data: null, 
        error: { message: `Dados muito grandes (${Math.round(dataSize/1024/1024*100)/100}MB). Remova algumas imagens ou divida em mais livros.` }
      };
    }
    
    const { data, error } = await supabase
      .from('books')
      .update(sanitizedData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error("Erro Supabase em updateBook:", error);
    } else {
      console.log("Livro atualizado com sucesso:", data?.id);
    }
    
    return { data, error };
  } catch (err) {
    console.error("Exceção não tratada em updateBook:", err);
    return { data: null, error: { message: `Erro interno: ${err.message}` }};
  }
};

// Função para excluir um livro
export const deleteBook = async (id) => {
  const { error } = await supabase
    .from('books')
    .delete()
    .eq('id', id);
  
  return { error };
}; 