import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { FiUser, FiMail, FiSave, FiLock, FiCamera, FiImage, FiX } from 'react-icons/fi';
import { useAuth } from '../../contexts/auth';
import Layout from '../../components/Layout';
import { supabase } from '../../utils/supabaseClient';
import MediaLibrary from '../../components/editor/MediaLibrary';

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading, updateUserData } = useAuth();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [photoPreview, setPhotoPreview] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  
  // Verificar autenticação
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (user) {
      // Preencher os campos com os dados do usuário
      setEmail(user.email || '');
      setName(user.user_metadata?.name || '');
      
      // Carregar foto do perfil se existir
      if (user.user_metadata?.avatar_url) {
        setPhotoPreview(user.user_metadata.avatar_url);
      }
      
      // Verificar se o bucket de avatares existe
      const checkAvatarsBucket = async () => {
        try {
          const { data: buckets, error } = await supabase.storage.listBuckets();
          
          if (error) {
            console.error('Erro ao listar buckets:', error);
            return;
          }
          
          const avatarBucketExists = buckets.some(bucket => bucket.name === 'avatars');
          
          if (!avatarBucketExists) {
            console.log('Criando bucket de avatares...');
            const { error: createError } = await supabase.storage.createBucket('avatars', {
              public: true
            });
            
            if (createError) {
              console.error('Erro ao criar bucket de avatares:', createError);
            }
          }
        } catch (err) {
          console.error('Erro ao verificar bucket de avatares:', err);
        }
      };
      
      checkAvatarsBucket();
    }
  }, [loading, user, router]);
  
  const handleMediaSelect = (file) => {
    if (file && file.url) {
      setPhotoPreview(file.url);
      setShowMediaLibrary(false);
    }
  };
  
  const handleOpenMediaLibrary = () => {
    setShowMediaLibrary(true);
  };
  
  const handleCloseMediaLibrary = () => {
    setShowMediaLibrary(false);
  };
  
  const handleRemovePhoto = () => {
    setPhotoPreview('');
  };
  
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    
    try {
      setIsSaving(true);
      
      // Preparar dados do perfil
      const userMetadata = {
        name: name,
      };
      
      // Adicionar ou remover URL da foto
      if (photoPreview) {
        userMetadata.avatar_url = photoPreview;
      } else {
        userMetadata.avatar_url = null;
      }
      
      // Atualizar metadados do usuário no Supabase
      const { error } = await supabase.auth.updateUser({
        data: userMetadata
      });
      
      if (error) throw error;
      
      // Atualizar o contexto de autenticação
      if (updateUserData) {
        await updateUserData();
      }
      
      setMessage({ 
        type: 'success', 
        text: 'Perfil atualizado com sucesso!' 
      });
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      setMessage({ 
        type: 'error', 
        text: `Falha ao atualizar o perfil: ${error.message}` 
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    
    if (newPassword !== confirmPassword) {
      setMessage({ 
        type: 'error', 
        text: 'As senhas não coincidem.' 
      });
      return;
    }
    
    try {
      setIsSaving(true);
      
      // Verificar a senha atual
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
      });
      
      if (signInError) {
        throw new Error('Senha atual incorreta. Por favor, verifique e tente novamente.');
      }
      
      // Atualizar senha no Supabase
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
      
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      setMessage({ 
        type: 'success', 
        text: 'Senha alterada com sucesso!' 
      });
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      setMessage({ 
        type: 'error', 
        text: error.message || 'Falha ao alterar a senha. Verifique se a senha atual está correta.'
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Carregando dados do perfil...</div>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <Head>
        <title>Meu Perfil | UniverseTeca CMS</title>
      </Head>
      
      {showMediaLibrary && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold">Selecionar Imagem</h3>
              <button 
                onClick={handleCloseMediaLibrary} 
                className="text-gray-500 hover:text-gray-700"
              >
                <FiX size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              <MediaLibrary 
                onSelect={handleMediaSelect} 
                mediaType="image" 
              />
            </div>
          </div>
        </div>
      )}
      
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">Meu Perfil</h1>
        
        {message.text && (
          <div className={`p-4 mb-6 rounded ${
            message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {message.text}
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Informações de perfil */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Informações de Perfil</h2>
            
            <form onSubmit={handleUpdateProfile}>
              {/* Foto de perfil */}
              <div className="mb-6 flex flex-col items-center">
                <div className="relative mb-3">
                  <div className="w-28 h-28 rounded-full overflow-hidden bg-gray-200 border">
                    {photoPreview ? (
                      <img 
                        src={photoPreview} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-blue-600 text-white text-4xl font-semibold">
                        {name ? name.charAt(0).toUpperCase() : (email ? email.charAt(0).toUpperCase() : 'U')}
                      </div>
                    )}
                  </div>
                  <button 
                    type="button"
                    onClick={handleOpenMediaLibrary}
                    className="absolute bottom-0 right-0 bg-white rounded-full p-2 border shadow-sm cursor-pointer hover:bg-gray-100"
                  >
                    <FiImage size={18} className="text-blue-600" />
                  </button>
                </div>
                
                {photoPreview && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Remover foto
                  </button>
                )}
              </div>
              
              <div className="mb-4">
                <label htmlFor="name" className="block text-gray-700 text-sm font-bold mb-2">
                  Nome completo
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiUser className="text-gray-400" />
                  </div>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10 shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    placeholder="Seu nome completo"
                  />
                </div>
              </div>
              
              <div className="mb-6">
                <label htmlFor="email" className="block text-gray-700 text-sm font-bold mb-2">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiMail className="text-gray-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    disabled
                    className="pl-10 shadow appearance-none border rounded w-full py-2 px-3 text-gray-500 bg-gray-100 leading-tight"
                    placeholder="seu@email.com"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">O email não pode ser alterado</p>
              </div>
              
              <button
                type="submit"
                disabled={isSaving}
                className={`flex items-center justify-center w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${
                  isSaving ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Salvando...
                  </>
                ) : (
                  <>
                    <FiSave className="mr-2" />
                    Salvar Alterações
                  </>
                )}
              </button>
            </form>
          </div>
          
          {/* Alteração de senha */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Alterar Senha</h2>
            
            <form onSubmit={handleChangePassword}>
              <div className="mb-4">
                <label htmlFor="current-password" className="block text-gray-700 text-sm font-bold mb-2">
                  Senha atual
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiLock className="text-gray-400" />
                  </div>
                  <input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="pl-10 shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    placeholder="Sua senha atual"
                    required
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label htmlFor="new-password" className="block text-gray-700 text-sm font-bold mb-2">
                  Nova senha
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiLock className="text-gray-400" />
                  </div>
                  <input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-10 shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    placeholder="Nova senha"
                    required
                  />
                </div>
              </div>
              
              <div className="mb-6">
                <label htmlFor="confirm-password" className="block text-gray-700 text-sm font-bold mb-2">
                  Confirmar nova senha
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiLock className="text-gray-400" />
                  </div>
                  <input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    placeholder="Confirme a nova senha"
                    required
                  />
                </div>
              </div>
              
              <button
                type="submit"
                disabled={isSaving}
                className={`flex items-center justify-center w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${
                  isSaving ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Salvando...
                  </>
                ) : (
                  <>
                    <FiSave className="mr-2" />
                    Alterar Senha
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
} 