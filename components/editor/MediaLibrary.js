import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { FiFolder, FiImage, FiMusic, FiVideo, FiFile, FiFilePlus, FiTrash2, FiArrowLeft, FiSearch, FiUpload, FiPlusCircle } from 'react-icons/fi';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Mapeamento de tipos de mídia para buckets
const BUCKET_MAP = {
  'image': 'covers',
  'background': 'covers',
  'audio': 'audios',
  'page': 'pages',
  'category': 'categories',
  'author': 'autores'
};

const MediaLibrary = ({ onSelect, mediaType = 'image' }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentFolder, setCurrentFolder] = useState('');
  const [breadcrumbs, setBreadcrumbs] = useState([{ name: 'Root', path: '' }]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [showFolderForm, setShowFolderForm] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState({});
  
  // Determine which bucket to use based on media type
  const bucketName = BUCKET_MAP[mediaType] || 'covers';
  
  // Load files when component mounts or folder/bucket changes
  useEffect(() => {
    loadFiles();
  }, [currentFolder, bucketName, mediaType]);

  // Function to load files from Supabase storage
  const loadFiles = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log(`Loading files from bucket: ${bucketName}, folder: ${currentFolder}`);

      // List files in the current folder
      const { data, error } = await supabase
        .storage
        .from(bucketName)
        .list(currentFolder, {
          sortBy: { column: 'name', order: 'asc' },
        });

      if (error) {
        throw new Error(error.message);
      }

      // Process files and folders
      const processedFiles = await Promise.all(data.map(async (item) => {
        // Process folders
        if (item.id === null) {
          return {
            ...item,
            type: 'folder',
            path: currentFolder ? `${currentFolder}/${item.name}` : item.name,
          };
        }

        // Process files
        // Get file type from metadata or extension
        const extension = item.name.split('.').pop().toLowerCase();
        let type = 'other';

        if (['jpg', 'jpeg', 'png', 'webp', 'svg'].includes(extension)) {
          type = 'image';
        } else if (extension === 'gif') {
          type = 'gif';
        } else if (['mp3', 'wav', 'ogg'].includes(extension)) {
          type = 'audio';
        } else if (['mp4', 'webm', 'mov'].includes(extension)) {
          type = 'video';
        } else if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt'].includes(extension)) {
          type = 'document';
        }

        // Get public URL
        const { data: publicUrl } = supabase
          .storage
          .from(bucketName)
          .getPublicUrl(currentFolder ? `${currentFolder}/${item.name}` : item.name);

        return {
          ...item,
          type,
          url: publicUrl.publicUrl,
          path: currentFolder ? `${currentFolder}/${item.name}` : item.name,
        };
      }));

      setFiles(processedFiles);
    } catch (err) {
      console.error('Error loading files:', err);
      setError(`Failed to load files: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle file delete
  const handleDeleteFile = async (file) => {
    if (!confirm(`Are you sure you want to delete ${file.name}?`)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .storage
        .from(bucketName)
        .remove([file.path]);

      if (error) {
        throw new Error(error.message);
      }

      // Reload files after deletion
      loadFiles();
    } catch (err) {
      console.error('Error deleting file:', err);
      setError(`Failed to delete file: ${err.message}`);
      setLoading(false);
    }
  };

  // Navigate to a folder
  const goToFolder = (folderPath) => {
    setCurrentFolder(folderPath);
    
    // Update breadcrumbs
    const pathParts = folderPath.split('/').filter(Boolean);
    const newBreadcrumbs = [{ name: 'Root', path: '' }];
    
    let currentPath = '';
    pathParts.forEach(part => {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      newBreadcrumbs.push({ name: part, path: currentPath });
    });
    
    setBreadcrumbs(newBreadcrumbs);
  };

  // Go back to parent folder
  const goBack = () => {
    if (currentFolder === '') return;
    
    const pathParts = currentFolder.split('/').filter(Boolean);
    pathParts.pop();
    const parentFolder = pathParts.join('/');
    
    setCurrentFolder(parentFolder);
    setBreadcrumbs(breadcrumbs.slice(0, -1));
  };

  // Handle file selection
  const handleSelect = (file) => {
    if (file.type === 'folder') {
      goToFolder(file.path);
    } else {
      setSelectedFile(file.id);
      // Removida a chamada automática de onSelect
    }
  };

  // Handle file confirmation
  const handleConfirmSelection = () => {
    if (selectedFile) {
      const file = files.find(f => f.id === selectedFile);
      if (file && onSelect && file.url) {
        console.log("MediaLibrary: handleConfirmSelection - Selected file:", file);
        onSelect(file);
      }
    }
  };
  
  // Handle double click selection
  const handleDoubleClick = (file) => {
    if (file.type !== 'folder') {
      setSelectedFile(file.id);
      if (onSelect && file.url) {
        console.log("MediaLibrary: handleDoubleClick - Selected file:", file);
        onSelect(file);
      }
    } else {
      goToFolder(file.path);
    }
  };

  // Handle create folder
  const handleCreateFolder = async (e) => {
    e.preventDefault();
    
    if (!newFolderName.trim()) {
      setError('Folder name cannot be empty');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Create an empty file in the folder to make it exist
      const folderPath = currentFolder 
        ? `${currentFolder}/${newFolderName}/.folder` 
        : `${newFolderName}/.folder`;

      const { error } = await supabase
        .storage
        .from(bucketName)
        .upload(folderPath, new Blob([''], { type: 'text/plain' }));

      if (error) {
        throw new Error(error.message);
      }

      setNewFolderName('');
      setShowFolderForm(false);
      loadFiles();
    } catch (err) {
      console.error('Error creating folder:', err);
      setError(`Failed to create folder: ${err.message}`);
      setLoading(false);
    }
  };

  // Handle file upload
  const handleFileUpload = async (e) => {
    const uploadFiles = Array.from(e.target.files);
    
    if (uploadFiles.length === 0) return;

    try {
      setLoading(true);
      setError(null);
      setUploadProgress({});

      // Upload each file
      await Promise.all(uploadFiles.map(async (file) => {
        const filePath = currentFolder 
          ? `${currentFolder}/${file.name}` 
          : file.name;

        // Create a new progress tracker for this file
        setUploadProgress(prev => ({
          ...prev,
          [file.name]: 0
        }));

        const { error } = await supabase
          .storage
          .from(bucketName)
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true,
            onUploadProgress: (progress) => {
              const percent = Math.round((progress.loaded / progress.total) * 100);
              setUploadProgress(prev => ({
                ...prev,
                [file.name]: percent
              }));
            }
          });

        if (error) {
          throw new Error(`Error uploading ${file.name}: ${error.message}`);
        }
      }));

      setShowUploadForm(false);
      loadFiles();
    } catch (err) {
      console.error('Error uploading files:', err);
      setError(`Upload failed: ${err.message}`);
      setLoading(false);
    }
  };

  // Filter files based on search query
  const filteredFiles = files.filter(file => {
    if (!searchQuery) return true;
    return file.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Group files by type
  const groupedFiles = {
    folders: [],
    images: [],
    gifs: [],
    audio: [],
    video: [],
    documents: [],
    other: []
  };

  filteredFiles.forEach(file => {
    if (file.type === 'folder') {
      groupedFiles.folders.push(file);
    } else if (file.type === 'gif') {
      groupedFiles.gifs.push(file);
    } else if (file.type === 'image') {
      groupedFiles.images.push(file);
    } else if (file.type === 'audio') {
      groupedFiles.audio.push(file);
    } else if (file.type === 'video') {
      groupedFiles.video.push(file);
    } else if (file.type === 'document') {
      groupedFiles.documents.push(file);
    } else {
      groupedFiles.other.push(file);
    }
  });

  // Get appropriate icon for file type
  const getFileIcon = (type) => {
    switch (type) {
      case 'folder':
        return <FiFolder className="text-yellow-500" />;
      case 'image':
        return <FiImage className="text-green-500" />;
      case 'audio':
        return <FiMusic className="text-blue-500" />;
      case 'video':
        return <FiVideo className="text-purple-500" />;
      case 'document':
        return <FiFile className="text-yellow-500" />;
      default:
        return <FiFile className="text-gray-500" />;
    }
  };

  const getMediaTypeTitle = () => {
    switch (mediaType) {
      case 'image':
      case 'background':
        return 'Selecionar Imagem';
      case 'audio':
        return 'Selecionar Áudio';
      case 'page':
        return 'Selecionar Imagem de Página';
      case 'category':
        return 'Selecionar Imagem de Categoria';
      case 'author':
        return 'Selecionar Foto de Autor';
      default:
        return 'Biblioteca de Mídia';
    }
  };

  // Determinar quais tipos de arquivos são aceitos para upload
  const getAcceptTypes = () => {
    switch (mediaType) {
      case 'image':
      case 'background':
      case 'category':
      case 'author':
      case 'page':
        return "image/*,.gif";
      case 'audio':
        return "audio/*";
      default:
        return "image/*,audio/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.gif";
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow max-h-[80vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">{getMediaTypeTitle()} - Bucket: {bucketName}</h3>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowFolderForm(true)}
            className="px-2 py-1 bg-gray-100 rounded text-sm hover:bg-gray-200 flex items-center"
          >
            <FiFolder className="mr-1" /> Nova Pasta
          </button>
          <button
            onClick={() => setShowUploadForm(true)}
            className="px-2 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 flex items-center"
          >
            <FiUpload className="mr-1" /> Upload
          </button>
        </div>
      </div>

      {/* Breadcrumbs navigation */}
      <div className="flex items-center space-x-1 mb-4 text-sm overflow-x-auto">
        {currentFolder && (
          <button 
            onClick={goBack}
            className="p-1 text-gray-500 hover:text-gray-700"
          >
            <FiArrowLeft />
          </button>
        )}
        
        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={crumb.path}>
            {index > 0 && <span className="text-gray-400">/</span>}
            <button
              onClick={() => goToFolder(crumb.path)}
              className={`hover:underline px-1 ${index === breadcrumbs.length - 1 ? 'font-medium' : ''}`}
            >
              {crumb.name}
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* New Folder Form */}
      {showFolderForm && (
        <div className="bg-gray-50 p-3 rounded mb-4">
          <form onSubmit={handleCreateFolder} className="flex flex-col space-y-2">
            <label className="text-sm font-medium">
              Nome da Nova Pasta
              <input
                type="text"
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                className="w-full mt-1 p-1 border border-gray-300 rounded text-sm"
                placeholder="Digite o nome da pasta"
                autoFocus
              />
            </label>
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowFolderForm(false)}
                className="px-2 py-1 border border-gray-300 rounded text-sm hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-2 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                Criar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Upload Form */}
      {showUploadForm && (
        <div className="bg-gray-50 p-3 rounded mb-4">
          <div className="flex flex-col space-y-2">
            <label className="text-sm font-medium flex items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:bg-gray-100 cursor-pointer">
              <div className="text-center">
                <FiPlusCircle className="mx-auto h-8 w-8 text-gray-400" />
                <span className="mt-2 block text-sm font-medium text-gray-700">
                  Clique para fazer upload de arquivos
                </span>
              </div>
              <input
                type="file"
                multiple
                accept={getAcceptTypes()}
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            <div className="text-xs text-gray-500 text-center">
              {mediaType === 'image' || mediaType === 'background' ? 'Suporta imagens e GIFs' : 
               mediaType === 'audio' ? 'Suporta arquivos de áudio (MP3, WAV, OGG)' :
               'Suporta múltiplos tipos de arquivos'}
            </div>
            <button
              onClick={() => setShowUploadForm(false)}
              className="px-2 py-1 border border-gray-300 rounded text-sm hover:bg-gray-100"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col space-y-4 mb-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Buscar arquivos..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-2 py-1 border border-gray-300 rounded text-sm"
          />
          <FiSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
        </div>
      </div>

      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
          {error}
        </div>
      )}

      {loading && filteredFiles.length === 0 ? (
        <div className="p-8 text-center text-gray-500">Carregando...</div>
      ) : filteredFiles.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          Nenhum arquivo encontrado.
        </div>
      ) : (
        <div className="space-y-4">
          {/* Folders (always appear first) */}
          {groupedFiles.folders.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Pastas</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {groupedFiles.folders.map(folder => (
                  <div 
                    key={folder.id || folder.name}
                    onClick={() => goToFolder(folder.path)}
                    className="flex items-center p-2 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer"
                  >
                    <FiFolder className="mr-2 text-yellow-500" />
                    <span className="truncate text-sm">{folder.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Images and GIFs (grid format) */}
          {(groupedFiles.images.length > 0 || groupedFiles.gifs.length > 0) && (
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Imagens</h4>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {[...groupedFiles.images, ...groupedFiles.gifs].map(file => (
                  <div 
                    key={file.id || file.name}
                    className={`relative group rounded border ${selectedFile === file.id ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-200'} overflow-hidden`}
                  >
                    <div 
                      className="aspect-square bg-gray-100 overflow-hidden flex items-center justify-center cursor-pointer"
                      onClick={() => handleSelect(file)}
                      onDoubleClick={() => handleDoubleClick(file)}
                    >
                      {file.url ? (
                        <img 
                          src={file.url} 
                          alt={file.name}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <div className="flex items-center justify-center w-full h-full bg-gray-200">
                          <FiImage className="text-gray-400" size={24} />
                        </div>
                      )}
                    </div>
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center pointer-events-none">
                    </div>
                    <div className="px-1 py-0.5 text-xs truncate">{file.name}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Audio files */}
          {groupedFiles.audio.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Áudios</h4>
              <div className="space-y-1">
                {groupedFiles.audio.map(file => (
                  <div 
                    key={file.id || file.name}
                    className={`flex items-center justify-between p-2 ${selectedFile === file.id ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 hover:bg-gray-100'} rounded cursor-pointer`}
                    onClick={() => handleSelect(file)}
                    onDoubleClick={() => handleDoubleClick(file)}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <FiMusic className="text-blue-500" />
                      <span className="truncate text-sm">{file.name}</span>
                    </div>
                    <div className="flex items-center">
                      <audio 
                        src={file.url} 
                        controls 
                        className="h-8 w-40 mx-2"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Other file types */}
          {['video', 'documents', 'other'].map(fileGroup => {
            const files = groupedFiles[fileGroup];
            if (files.length === 0) return null;
            
            return (
              <div key={fileGroup}>
                <h4 className="font-medium text-gray-700 mb-2 capitalize">{fileGroup}</h4>
                <div className="space-y-1">
                  {files.map(file => (
                    <div 
                      key={file.id || file.name}
                      className={`flex items-center justify-between p-2 ${selectedFile === file.id ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 hover:bg-gray-100'} rounded cursor-pointer`}
                      onClick={() => handleSelect(file)}
                      onDoubleClick={() => handleDoubleClick(file)}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        {getFileIcon(file.type)}
                        <span className="truncate text-sm">{file.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Confirmation button (only show when an item is selected) */}
          {selectedFile && (
            <div className="fixed bottom-4 inset-x-0 flex justify-center z-10">
              <div className="flex space-x-2">
                <button 
                  onClick={() => {
                    const file = files.find(f => f.id === selectedFile);
                    if (file) handleDeleteFile(file);
                  }}
                  className="bg-red-600 text-white px-4 py-2 rounded shadow-lg hover:bg-red-700 transition-colors flex items-center"
                >
                  <FiTrash2 className="mr-2" /> Excluir
                </button>
                <button 
                  onClick={handleConfirmSelection}
                  className="bg-blue-600 text-white px-4 py-2 rounded shadow-lg hover:bg-blue-700 transition-colors"
                >
                  Confirmar seleção
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MediaLibrary; 