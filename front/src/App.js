import React, { useState, useRef } from 'react';
import './App.css';

function App() {
  const [originalImage, setOriginalImage] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentView, setCurrentView] = useState('upload');
  const [isFunctionsOpen, setIsFunctionsOpen] = useState(false);
  const [selectedFunction, setSelectedFunction] = useState('remove-bg');
  const [currentPage, setCurrentPage] = useState('main');
  const [error, setError] = useState(null);
  
  const fileInputRef = useRef(null);

  // URL вашего Python бэкенда
  const API_URL = 'http://localhost:8000';

  const isRemoveBgSelected = selectedFunction === 'remove-bg';
  const isMainPage = currentPage === 'main';

  const handleImageUpload = (event) => {
    if (!isRemoveBgSelected || !isMainPage) return;
    
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      if (file.size > 10 * 1024 * 1024) {
        setError('Файл слишком большой. Максимальный размер: 10MB');
        return;
      }
      
      const imageUrl = URL.createObjectURL(file);
      setOriginalImage({
        file,
        url: imageUrl,
        name: file.name
      });
      setCurrentView('processing');
      setProcessedImage(null);
      setError(null);
    }
  };

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Функция для отправки изображения на бэкенд - ИСПРАВЛЕННАЯ ВЕРСИЯ
  const processImage = async (imageFile) => {
    // Создаем FormData ПРАВИЛЬНО
    const formData = new FormData();
    // Важно: используем 'file' как имя параметра (как в бэкенде)
    formData.append('file', imageFile);
    // НЕ указываем третьим параметром имя файла, если бэкенд ругается
    
    try {
      const response = await fetch(`${API_URL}/process`, {
        method: 'POST',
        body: formData,
        // ВАЖНО: НЕ добавляем заголовок Content-Type вручную!
        // Браузер сам поставит правильный с boundary
      });
      
      if (!response.ok) {
        // Попробуем получить текст ошибки
        let errorText = 'Неизвестная ошибка сервера';
        try {
          errorText = await response.text();
        } catch (e) {
          // Не удалось прочитать текст
        }
        
        // Пробуем разные варианты формата
        if (response.status === 400) {
          // Пробуем отправить по-другому
          return await processImageAlternative(imageFile);
        }
        
        throw new Error(`Ошибка сервера (${response.status}): ${errorText}`);
      }
      
      const blob = await response.blob();
      
      if (!blob.type.startsWith('image/')) {
        throw new Error('Сервер вернул не изображение');
      }
      
      const processedUrl = URL.createObjectURL(blob);
      
      return {
        url: processedUrl,
        blob: blob
      };
    } catch (err) {
      console.error('Ошибка при обработке изображения:', err);
      
      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        throw new Error('Не удалось подключиться к серверу обработки');
      }
      
      throw err;
    }
  };

  // Альтернативный метод отправки - если первый не работает
  const processImageAlternative = async (imageFile) => {
    console.log('Пробуем альтернативный метод отправки...');
    
    // Вариант 1: С явным именем файла
    const formData = new FormData();
    formData.append('file', imageFile, imageFile.name);
    
    const response = await fetch(`${API_URL}/process`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      // Вариант 2: Может бэкенд ожидает другой Content-Type?
      const formData2 = new FormData();
      formData2.append('file', imageFile);
      
      const response2 = await fetch(`${API_URL}/process`, {
        method: 'POST',
        body: formData2,
        headers: {
          // Явно указываем Content-Type
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (!response2.ok) {
        throw new Error(`Все методы отправки не работают (${response2.status})`);
      }
      
      const blob = await response2.blob();
      const processedUrl = URL.createObjectURL(blob);
      
      return {
        url: processedUrl,
        blob: blob
      };
    }
    
    const blob = await response.blob();
    const processedUrl = URL.createObjectURL(blob);
    
    return {
      url: processedUrl,
      blob: blob
    };
  };

  const handleProcessImage = async () => {
    if (!originalImage || !isRemoveBgSelected || !isMainPage) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      const result = await processImage(originalImage.file);
      
      setProcessedImage({
        url: result.url,
        blob: result.blob,
        name: `processed-${originalImage.name.replace(/\.[^/.]+$/, "")}.jpg`
      });
      setCurrentView('result');
    } catch (err) {
      setError(err.message || 'Не удалось обработать изображение. Проверьте: 1) Бэкенд запущен? 2) CORS настроен?');
      console.error('Ошибка обработки:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // ... остальные функции остаются без изменений
  const handleFunctionSelect = (functionName) => {
    setSelectedFunction(functionName);
    setIsFunctionsOpen(false);
    setCurrentPage('main');
    
    cleanupImages();
    
    setOriginalImage(null);
    setProcessedImage(null);
    setCurrentView('upload');
    setError(null);
  };

  const handleProfileClick = () => {
    setCurrentPage('profile');
    setIsFunctionsOpen(false);
    
    cleanupImages();
    
    setOriginalImage(null);
    setProcessedImage(null);
    setError(null);
  };

  const cleanupImages = () => {
    if (originalImage && originalImage.url) {
      URL.revokeObjectURL(originalImage.url);
    }
    if (processedImage && processedImage.url) {
      URL.revokeObjectURL(processedImage.url);
    }
  };

  const handleNewImage = () => {
    cleanupImages();
    
    setOriginalImage(null);
    setProcessedImage(null);
    setCurrentView('upload');
    setError(null);
  };

  const handleDownload = () => {
    if (!processedImage || !processedImage.blob) return;

    const url = window.URL.createObjectURL(processedImage.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = processedImage.name || 'processed-image.jpg';
    document.body.appendChild(link);
    link.click();
    
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }, 100);
  };

  const toggleFunctionsDropdown = () => {
    setIsFunctionsOpen(!isFunctionsOpen);
  };

  const getFunctionDisplayName = () => {
    switch (selectedFunction) {
      case 'remove-bg':
        return 'Удалить фон';
      case 'resize':
        return 'Изменить размер';
      case 'format':
        return 'Изменить формат';
      default:
        return 'Удалить фон';
    }
  };

  // Проверка доступности бэкенда при загрузке
  React.useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await fetch(`${API_URL}/docs`);
        console.log('Бэкенд доступен');
      } catch (err) {
        console.warn('Бэкенд недоступен:', err.message);
        setError('Бэкенд недоступен. Убедитесь что сервер запущен на localhost:8000');
      }
    };
    
    if (isMainPage && isRemoveBgSelected) {
      checkBackend();
    }
  }, [isMainPage, isRemoveBgSelected]);

  return (
    <div className="app">
      <main className="main-content">
        <div className="top-navigation">
          <div className="nav-left">
            <div className="logo">remov'bl</div>
            <nav className="nav">
              <button 
                className={`nav-button ${currentPage === 'main' ? 'active' : ''}`}
                onClick={() => {
                  setCurrentPage('main');
                  setIsFunctionsOpen(false);
                  cleanupImages();
                  setOriginalImage(null);
                  setProcessedImage(null);
                  setCurrentView('upload');
                }}
              >
                {getFunctionDisplayName()}
              </button>
              <div className="dropdown-container">
                <button 
                  className="nav-button dropdown-toggle"
                  onClick={toggleFunctionsDropdown}
                >
                  Функции
                </button>
                {isFunctionsOpen && (
                  <div className="dropdown-menu">
                    <button 
                      className={`dropdown-item ${selectedFunction === 'remove-bg' ? 'active' : ''}`}
                      onClick={() => handleFunctionSelect('remove-bg')}
                    >
                      Удаление фона
                    </button>
                    <button 
                      className={`dropdown-item ${selectedFunction === 'resize' ? 'active' : ''}`}
                      onClick={() => handleFunctionSelect('resize')}
                    >
                      Изменение размера изображения
                    </button>
                    <button 
                      className={`dropdown-item ${selectedFunction === 'format' ? 'active' : ''}`}
                      onClick={() => handleFunctionSelect('format')}
                    >
                      Изменение формата
                    </button>
                  </div>
                )}
              </div>
              <button 
                className={`nav-button ${currentPage === 'profile' ? 'active' : ''}`}
                onClick={handleProfileClick}
              >
                Профиль
              </button>
            </nav>
          </div>
          
          <img 
            src="/images/avatar.jpg" 
            alt="User" 
            className="user-photo"
          />
        </div>

        <div className="content-area">
          {error && (
            <div className="error-message" style={{
              backgroundColor: '#fee',
              color: '#c33',
              padding: '12px 20px',
              borderRadius: '8px',
              marginBottom: '20px',
              border: '1px solid #fcc',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}
          
          {currentPage === 'profile' ? (
            <div className="under-development">
              <div className="development-content">
                <div className="development-icon">👤</div>
                <h2>Профиль в разработке</h2>
                <p>Личный кабинет пользователя скоро будет доступен</p>
                <button 
                  className="development-button"
                  onClick={() => {
                    setCurrentPage('main');
                    setError(null);
                  }}
                >
                  Вернуться на главную
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="content-header">
                {isRemoveBgSelected ? (
                  <>
                    {currentView === 'upload' && <h1>Обработка изображений</h1>}
                    {currentView === 'processing' && <h2>Обработка изображения</h2>}
                    {currentView === 'result' && <h2>Изображение обработано!</h2>}
                  </>
                ) : (
                  <h1>{getFunctionDisplayName()}</h1>
                )}
                
                {currentView === 'upload' && isRemoveBgSelected && (
                  <p className="subtitle">Автоматически и бесплатно</p>
                )}
              </div>

              <div className="content-main">
                {isRemoveBgSelected ? (
                  <>
                    {currentView === 'upload' && (
                      <div className="upload-section">
                        <div className="upload-area" onClick={handleUploadClick}>
                          <div className="upload-content">
                            <div className="upload-icon">📁</div>
                            <p className="upload-text">Выбрать изображение</p>
                            <p className="upload-subtext">PNG, JPG, JPEG до 10MB</p>
                            <p style={{ fontSize: '0.8rem', color: '#888', marginTop: '10px' }}>
                              API: {API_URL}/process
                            </p>
                          </div>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            style={{ display: 'none' }}
                          />
                        </div>
                      </div>
                    )}

                    {currentView === 'processing' && originalImage && (
                      <div className="processing-section">
                        <div className="preview-container">
                          <div className="image-preview">
                            <h3>Исходное изображение</h3>
                            <div className="image-container">
                              <img 
                                src={originalImage.url} 
                                alt="Original"
                                className="preview-image"
                              />
                            </div>
                          </div>
                        </div>
                        
                        <button 
                          className={`process-button ${isProcessing ? 'processing' : ''}`}
                          onClick={handleProcessImage}
                          disabled={isProcessing}
                        >
                          {isProcessing ? (
                            <>
                              <div className="spinner"></div>
                              Отправка на сервер...
                            </>
                          ) : (
                            'Отправить на обработку'
                          )}
                        </button>
                      </div>
                    )}

                    {currentView === 'result' && processedImage && originalImage && (
                      <div className="result-section">
                        <div className="comparison-container">
                          <div className="image-preview">
                            <h3>До</h3>
                            <div className="image-container">
                              <img 
                                src={originalImage.url} 
                                alt="До обработки"
                                className="preview-image"
                              />
                            </div>
                          </div>
                          <div className="image-preview">
                            <h3>После</h3>
                            <div className="image-container">
                              {processedImage.url ? (
                                <img 
                                  src={processedImage.url} 
                                  alt="После обработки"
                                  className="preview-image"
                                />
                              ) : (
                                <div style={{
                                  padding: '40px',
                                  color: '#666',
                                  fontStyle: 'italic',
                                  textAlign: 'center'
                                }}>
                                  Результат не получен
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="action-buttons">
                          <button className="download-button" onClick={handleDownload}>
                            Скачать результат
                          </button>
                          <button className="secondary-button" onClick={handleNewImage}>
                            Обработать другое изображение
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="under-development">
                    <div className="development-content">
                      <div className="development-icon">🚧</div>
                      <h2>Страница находится в разработке</h2>
                      <p>Функция "{getFunctionDisplayName()}" скоро будет доступна</p>
                      <button 
                        className="development-button"
                        onClick={() => handleFunctionSelect('remove-bg')}
                      >
                        Вернуться к удалению фона
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;