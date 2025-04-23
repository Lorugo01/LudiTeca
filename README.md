# UniverseTeca CMS

Sistema de Gerenciamento de Conteúdo para a Biblioteca Digital UniverseTeca.

## Estrutura de Páginas

### 1. Autenticação e Navegação
- **Página Inicial** (`/`)
  - Redirecionamento automático baseado no estado de autenticação
  - Usuários autenticados são direcionados para `/books`
  - Usuários não autenticados são direcionados para `/login`

- **Login** (`/login`)
  - Formulário de autenticação com email e senha
  - Integração com Supabase para autenticação
  - Feedback visual para erros e sucesso
  - Redirecionamento após login bem-sucedido

### 2. Gerenciamento de Perfil
- **Perfil do Usuário** (`/profile`)
  - Edição de informações pessoais
  - Upload e gerenciamento de foto de perfil
  - Alteração de senha com validações de segurança
  - Integração com Supabase para atualização de dados

### 3. Gerenciamento de Autores
- **Lista de Autores** (`/authors`)
  - Visualização em grid de todos os autores
  - Busca por nome
  - Ações rápidas (editar, excluir)
  - Criação de novo autor

- **Novo Autor** (`/authors/new`)
  - Formulário para cadastro de autor
  - Upload de foto do autor
  - Campos para biografia e informações adicionais

- **Edição de Autor** (`/authors/[id]`)
  - Edição de informações do autor
  - Gerenciamento de foto
  - Visualização de livros associados

### 4. Gerenciamento de Categorias
- **Lista de Categorias** (`/categories`)
  - Visualização em grid de todas as categorias
  - Busca por nome
  - Ações rápidas (editar, excluir)
  - Criação de nova categoria

- **Nova Categoria** (`/categories/new`)
  - Formulário para cadastro de categoria
  - Upload de ícone
  - Campos para descrição e informações adicionais

- **Edição de Categoria** (`/categories/[id]`)
  - Edição de informações da categoria
  - Gerenciamento de ícone
  - Visualização de livros associados

### 5. Gerenciamento de Livros
- **Lista de Livros** (`/books`)
  - Visualização em grid de todos os livros
  - Busca por título, autor ou descrição
  - Filtros por categoria
  - Ações rápidas (editar, excluir)
  - Criação de novo livro

- **Novo Livro** (`/books/new`)
  - Formulário para cadastro de livro
  - Seleção de autor e categoria
  - Upload de capa
  - Campos para título e descrição
  - Criação da primeira página

- **Edição de Livro** (`/books/[id]/edit`)
  - Edição completa do livro
  - Gerenciamento de páginas
  - Upload e gerenciamento de mídias
  - Salvamento automático
  - Preview em tempo real

## Recursos Técnicos

### Autenticação e Segurança
- Integração com Supabase para autenticação
- Proteção de rotas
- Gerenciamento de sessão
- Validações de segurança

### Interface do Usuário
- Design responsivo com Tailwind CSS
- Feedback visual para ações
- Loading states
- Mensagens de erro e sucesso
- Ícones intuitivos

### Gerenciamento de Mídia
- Upload de imagens
- Gerenciamento de arquivos
- Preview de mídias
- Organização em pastas

### Performance
- Carregamento otimizado
- Paginação de listas
- Cache de dados
- Salvamento automático

## Requisitos do Sistema

- Node.js 14.x ou superior
- Navegador moderno (Chrome, Firefox, Edge)
- Conexão com internet (para autenticação com Supabase)

## Inicialização

1. Clone o repositório
2. Instale as dependências: `npm install`
3. Configure as variáveis de ambiente
4. Inicie o servidor: `npm run dev`
5. Acesse: `http://localhost:3000`

## Suporte

Em caso de problemas:
1. Verifique se o Node.js está instalado corretamente
2. Confirme que as variáveis de ambiente estão configuradas
3. Verifique a conexão com internet

Para mais informações ou ajuda, contate o suporte técnico. 