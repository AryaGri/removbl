import React, { useState, useRef, useEffect, useCallback } from 'react';
import './App.css';

function App() {
  // Основные состояния
  const [originalImage, setOriginalImage] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentView, setCurrentView] = useState('upload');
  const [isFunctionsOpen, setIsFunctionsOpen] = useState(false);
  const [selectedFunction, setSelectedFunction] = useState('remove-bg');
  const [currentPage, setCurrentPage] = useState('main');
  const [error, setError] = useState(null);
  const [backendStatus, setBackendStatus] = useState('checking');
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const fileInputRef = useRef(null);
  const uploadAreaRef = useRef(null);

  // URL бэкенда (адаптивный для разных окружений)
  const API_URL = process.env.NODE_ENV === 'production' 
    ? 'http://back-service:8000'
    : 'http://localhost:8000';

  const isRemoveBgSelected = selectedFunction === 'remove-bg';
  const isMainPage = currentPage === 'main';

  // ==================== ОБРАБОТЧИКИ СОБЫТИЙ ====================

  // Обработчик загрузки файла
  const handleImageUpload = useCallback((event) => {
    if (!isRemoveBgSelected || !isMainPage) return;
    
    const file = event.target.files ? event.target.files[0] : event.dataTransfer?.files[0];
    
    if (!file) return;
    
    // Валидация файла
    if (!file.type.startsWith('image/')) {
      setError('Пожалуйста, выберите файл изображения (JPG, PNG, WEBP)');
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      setError('Файл слишком большой. Максимальный размер: 10MB');
      return;
    }
    
    // Симуляция прогресса загрузки
    setUploadProgress(0);
    const simulateProgress = () => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          const imageUrl = URL.createObjectURL(file);
          setOriginalImage({
            file,
            url: imageUrl,
            name: file.name,
            size: file.size,
            type: file.type
          });
          setCurrentView('processing');
          setProcessedImage(null);
          setError(null);
          return 100;
        }
        return prev + 20;
      });
    };
    
    // Имитация прогресса загрузки
    const interval = setInterval(simulateProgress, 100);
    setTimeout(() => clearInterval(interval), 500);
    
  }, [isRemoveBgSelected, isMainPage]);

  // Обработчик клика на область загрузки
  const handleUploadClick = useCallback(() => {
    if (fileInputRef.current && isRemoveBgSelected && isMainPage) {
      fileInputRef.current.click();
    }
  }, [isRemoveBgSelected, isMainPage]);

  // Обработка изображения через API
  const processImage = useCallback(async (imageFile) => {
    console.log('Отправка файла на бэкенд...');
    console.log('URL бэкенда:', API_URL);
    
    const formData = new FormData();
    formData.append('file', imageFile);
    
    try {
      const response = await fetch(`${API_URL}/process`, {
        method: 'POST',
        body: formData,
      });
      
      console.log('Статус ответа:', response.status);
      
      if (!response.ok) {
        let errorText = 'Неизвестная ошибка сервера';
        try {
          errorText = await response.text();
          console.log('Текст ошибки:', errorText);
        } catch (e) {
          console.log('Не удалось прочитать текст ошибки');
        }
        
        throw new Error(`Ошибка сервера (${response.status}): ${errorText}`);
      }
      
      const contentType = response.headers.get('content-type');
      console.log('Content-Type ответа:', contentType);
      
      const blob = await response.blob();
      console.log('Размер blob:', blob.size, 'тип:', blob.type);
      
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
  }, [API_URL]);

  // Основная функция обработки изображения
  const handleProcessImage = useCallback(async () => {
    if (!originalImage || !isRemoveBgSelected || !isMainPage) return;
    
    setIsProcessing(true);
    setError(null);
    setUploadProgress(0);
    
    try {
      const result = await processImage(originalImage.file);
      
      setProcessedImage({
        url: result.url,
        blob: result.blob,
        name: `processed-${originalImage.name.replace(/\.[^/.]+$/, "")}.png`
      });
      setCurrentView('result');
      setUploadProgress(100);
    } catch (err) {
      setError(err.message);
      console.error('Ошибка обработки:', err);
    } finally {
      setIsProcessing(false);
    }
  }, [originalImage, isRemoveBgSelected, isMainPage, processImage]);

  // Выбор функции из меню
  const handleFunctionSelect = useCallback((functionName) => {
    setSelectedFunction(functionName);
    setIsFunctionsOpen(false);
    setCurrentPage('main');
    
    cleanupImages();
    
    setOriginalImage(null);
    setProcessedImage(null);
    setCurrentView('upload');
    setError(null);
    setUploadProgress(0);
  }, []);

  // Переход в профиль
  const handleProfileClick = useCallback(() => {
    setCurrentPage('profile');
    setIsFunctionsOpen(false);
    
    cleanupImages();
    
    setOriginalImage(null);
    setProcessedImage(null);
    setError(null);
    setUploadProgress(0);
  }, []);

  // Очистка ресурсов
  const cleanupImages = useCallback(() => {
    if (originalImage && originalImage.url) {
      URL.revokeObjectURL(originalImage.url);
    }
    if (processedImage && processedImage.url) {
      URL.revokeObjectURL(processedImage.url);
    }
  }, [originalImage, processedImage]);

  // Сброс для новой загрузки
  const handleNewImage = useCallback(() => {
    cleanupImages();
    
    setOriginalImage(null);
    setProcessedImage(null);
    setCurrentView('upload');
    setError(null);
    setUploadProgress(0);
  }, [cleanupImages]);

  // Скачивание результата
  const handleDownload = useCallback(() => {
    if (!processedImage || !processedImage.blob) return;

    const url = window.URL.createObjectURL(processedImage.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = processedImage.name || 'processed-image.png';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }, 100);
  }, [processedImage]);

  // Переключение выпадающего меню
  const toggleFunctionsDropdown = useCallback(() => {
    setIsFunctionsOpen(prev => !prev);
  }, []);

  // Получение отображаемого имени функции
  const getFunctionDisplayName = useCallback(() => {
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
  }, [selectedFunction]);

  // Обработчики drag & drop
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (uploadAreaRef.current && isRemoveBgSelected && isMainPage) {
      uploadAreaRef.current.style.borderColor = '#28a745';
      uploadAreaRef.current.style.backgroundColor = '#f0fff4';
    }
  }, [isRemoveBgSelected, isMainPage]);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (uploadAreaRef.current) {
      uploadAreaRef.current.style.borderColor = '#dee2e6';
      uploadAreaRef.current.style.backgroundColor = '#f8f9fa';
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (uploadAreaRef.current) {
      uploadAreaRef.current.style.borderColor = '#dee2e6';
      uploadAreaRef.current.style.backgroundColor = '#f8f9fa';
    }
    handleImageUpload(e);
  }, [handleImageUpload]);

  // ==================== ЭФФЕКТЫ ====================

  // Проверка доступности бэкенда
  useEffect(() => {
    const checkBackend = async () => {
      try {
        setBackendStatus('checking');
        
        const response = await fetch(`${API_URL}/docs`, {
          method: 'HEAD',
          mode: 'cors',
          cache: 'no-cache'
        });
        
        if (response.ok) {
          setBackendStatus('available');
          setError(null);
        } else {
          setBackendStatus('unavailable');
          setError(`Бэкенд недоступен (статус: ${response.status})`);
        }
      } catch (err) {
        setBackendStatus('unavailable');
        setError(`Бэкенд недоступен: ${err.message}`);
      }
    };
    
    if (isMainPage && isRemoveBgSelected) {
      checkBackend();
      const interval = setInterval(checkBackend, 30000); // Проверка каждые 30 секунд
      return () => clearInterval(interval);
    }
  }, [isMainPage, isRemoveBgSelected, API_URL]);

  // Очистка ресурсов при размонтировании
  useEffect(() => {
    return () => {
      cleanupImages();
    };
  }, [cleanupImages]);

  // Добавление обработчиков drag & drop
  useEffect(() => {
    const uploadArea = uploadAreaRef.current;
    if (uploadArea && isRemoveBgSelected && isMainPage) {
      uploadArea.addEventListener('dragover', handleDragOver);
      uploadArea.addEventListener('dragleave', handleDragLeave);
      uploadArea.addEventListener('drop', handleDrop);
      
      return () => {
        uploadArea.removeEventListener('dragover', handleDragOver);
        uploadArea.removeEventListener('dragleave', handleDragLeave);
        uploadArea.removeEventListener('drop', handleDrop);
      };
    }
  }, [handleDragOver, handleDragLeave, handleDrop, isRemoveBgSelected, isMainPage]);

  // ==================== РЕНДЕРИНГ ====================

  return (
    <div className="app" data-testid="app">
      <main className="main-content">
        {/* Навигационная панель */}
        <div className="top-navigation">
          <div className="nav-left">
            <div className="logo" data-testid="logo">remov'bl</div>
            <nav className="nav">
              <button 
                className={`nav-button ${currentPage === 'main' ? 'active' : ''}`}
                onClick={() => {
                  setCurrentPage('main');
                  setIsFunctionsOpen(false);
                  handleNewImage();
                }}
                data-testid="nav-remove-bg"
              >
                {getFunctionDisplayName()}
              </button>
              
              <div className="dropdown-container">
                <button 
                  className="nav-button dropdown-toggle"
                  onClick={toggleFunctionsDropdown}
                  data-testid="nav-functions"
                >
                  Функции
                </button>
                {isFunctionsOpen && (
                  <div className="dropdown-menu" data-testid="functions-dropdown">
                    <button 
                      className={`dropdown-item ${selectedFunction === 'remove-bg' ? 'active' : ''}`}
                      onClick={() => handleFunctionSelect('remove-bg')}
                      data-testid="function-remove-bg"
                    >
                      Удаление фона
                    </button>
                    <button 
                      className={`dropdown-item ${selectedFunction === 'resize' ? 'active' : ''}`}
                      onClick={() => handleFunctionSelect('resize')}
                      data-testid="function-resize"
                    >
                      Изменение размера изображения
                    </button>
                    <button 
                      className={`dropdown-item ${selectedFunction === 'format' ? 'active' : ''}`}
                      onClick={() => handleFunctionSelect('format')}
                      data-testid="function-format"
                    >
                      Изменение формата
                    </button>
                  </div>
                )}
              </div>
              
              <button 
                className={`nav-button ${currentPage === 'profile' ? 'active' : ''}`}
                onClick={handleProfileClick}
                data-testid="nav-profile"
              >
                Профиль
              </button>
            </nav>
          </div>
          
          <img 
            src="/images/avatar.jpg" 
            alt="User" 
            className="user-photo"
            data-testid="user-avatar"
          />
        </div>

        {/* Основная область контента */}
        <div className="content-area">
          {/* Отображение ошибок */}
          {error && (
            <div className="error-message" data-testid="error-message">
              <strong>Ошибка:</strong> {error}
              <div style={{ fontSize: '0.9rem', marginTop: '5px' }}>
                {backendStatus === 'checking' && 'Проверяем подключение к серверу...'}
                {backendStatus === 'unavailable' && (
                  <div>
                    <p>Рекомендуемые действия:</p>
                    <ol style={{ textAlign: 'left', margin: '5px 0', paddingLeft: '20px' }}>
                      <li>Откройте <a href={`${API_URL}/docs`} target="_blank" rel="noopener noreferrer">документацию бэкенда</a> в новой вкладке</li>
                      <li>Убедитесь, что бэкенд-сервис запущен</li>
                      <li>Проверьте сетевое подключение</li>
                      <li>Перезагрузите страницу</li>
                    </ol>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Страница профиля */}
          {currentPage === 'profile' ? (
            <div className="under-development" data-testid="profile-page">
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
                  data-testid="back-to-main"
                >
                  Вернуться на главную
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Заголовок контента */}
              <div className="content-header">
                {isRemoveBgSelected ? (
                  <>
                    {currentView === 'upload' && (
                      <h1 data-testid="page-title">Обработка изображений</h1>
                    )}
                    {currentView === 'processing' && (
                      <h2 data-testid="page-title">Обработка изображения</h2>
                    )}
                    {currentView === 'result' && (
                      <h2 data-testid="page-title">Изображение обработано!</h2>
                    )}
                  </>
                ) : (
                  <h1 data-testid="page-title">{getFunctionDisplayName()}</h1>
                )}
                
                {currentView === 'upload' && isRemoveBgSelected && (
                  <p className="subtitle" data-testid="page-subtitle">
                    Автоматически удаляем фон с фотографий. Быстро, качественно, бесплатно
                  </p>
                )}
              </div>

              {/* Основной контент */}
              <div className="content-main">
                {isRemoveBgSelected ? (
                  <>
                    {/* Состояние загрузки */}
                    {currentView === 'upload' && (
                      <div className="upload-section" data-testid="upload-section">
                        <div 
                          className="upload-area" 
                          onClick={handleUploadClick}
                          ref={uploadAreaRef}
                          data-testid="upload-area"
                        >
                          <div className="upload-content">
                            <div className="upload-icon">📁</div>
                            <p className="upload-text">Выбрать изображение</p>
                            <p className="upload-subtext">Перетащите файл или кликните для выбора</p>
                            <p className="upload-subtext">PNG, JPG, JPEG, WEBP до 10MB</p>
                          </div>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            style={{ display: 'none' }}
                            data-testid="file-input"
                          />
                        </div>
                        
                        {/* Индикатор прогресса (скрыт при загрузке) */}
                        {uploadProgress > 0 && uploadProgress < 100 && (
                          <div className="progress-container" data-testid="upload-progress">
                            <div className="progress-bar">
                              <div 
                                className="progress-fill" 
                                style={{ width: `${uploadProgress}%` }}
                              ></div>
                            </div>
                            <div className="progress-text">
                              Загрузка: {uploadProgress}%
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Состояние обработки */}
                    {currentView === 'processing' && originalImage && (
                      <div className="processing-section" data-testid="processing-section">
                        <div className="preview-container">
                          <div className="image-preview">
                            <h3>Исходное изображение</h3>
                            <div className="image-container">
                              <img 
                                src={originalImage.url} 
                                alt="Original"
                                className="preview-image"
                                data-testid="original-image"
                              />
                            </div>
                            <p className="image-info">
                              {originalImage.name} ({Math.round(originalImage.size / 1024)} KB)
                            </p>
                          </div>
                        </div>
                        
                        {/* Индикатор прогресса обработки */}
                        {uploadProgress > 0 && (
                          <div className="progress-container" data-testid="process-progress">
                            <div className="progress-bar">
                              <div 
                                className="progress-fill" 
                                style={{ width: `${uploadProgress}%` }}
                              ></div>
                            </div>
                            <div className="progress-text">
                              {uploadProgress < 100 ? 'Подготовка...' : 'Готово к обработке'}
                            </div>
                          </div>
                        )}
                        
                        <button 
                          className={`process-button ${isProcessing ? 'processing' : ''}`}
                          onClick={handleProcessImage}
                          disabled={isProcessing || uploadProgress < 100}
                          data-testid="process-button"
                        >
                          {isProcessing ? (
                            <>
                              <div className="spinner" data-testid="spinner"></div>
                              Отправка на сервер...
                            </>
                          ) : (
                            'Отправить на обработку'
                          )}
                        </button>
                        
                        {isProcessing && (
                          <p style={{ color: '#666', marginTop: '10px' }}>
                            Идет обработка на сервере... Это может занять несколько секунд
                          </p>
                        )}
                        
                        <button 
                          className="secondary-button"
                          onClick={handleNewImage}
                          style={{ marginTop: '1rem' }}
                          data-testid="cancel-button"
                        >
                          Выбрать другое изображение
                        </button>
                      </div>
                    )}

                    {/* Состояние результата */}
                    {currentView === 'result' && processedImage && originalImage && (
                      <div className="result-section" data-testid="result-section">
                        <div className="comparison-container">
                          <div className="image-preview">
                            <h3>До обработки</h3>
                            <div className="image-container">
                              <img 
                                src={originalImage.url} 
                                alt="До обработки"
                                className="preview-image"
                                data-testid="before-image"
                              />
                            </div>
                          </div>
                          <div className="image-preview">
                            <h3>После обработки</h3>
                            <div className="image-container">
                              {processedImage.url ? (
                                <img 
                                  src={processedImage.url} 
                                  alt="После обработки"
                                  className="preview-image"
                                  data-testid="after-image"
                                />
                              ) : (
                                <div className="no-result">
                                  Результат не получен
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="action-buttons">
                          <button 
                            className="download-button" 
                            onClick={handleDownload}
                            data-testid="download-button"
                          >
                            Скачать результат
                          </button>
                          <button 
                            className="secondary-button" 
                            onClick={handleNewImage}
                            data-testid="new-image-button"
                          >
                            Обработать другое изображение
                          </button>
                        </div>
                        
                        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                          <p style={{ color: '#666', fontSize: '0.9rem' }}>
                            Совет: Для сохранения прозрачного фона скачайте изображение в формате PNG
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  /* Страницы других функций (в разработке) */
                  <div className="under-development" data-testid="function-development">
                    <div className="development-content">
                      <div className="development-icon">🚧</div>
                      <h2>Страница находится в разработке</h2>
                      <p>Функция "{getFunctionDisplayName()}" скоро будет доступна</p>
                      <button 
                        className="development-button"
                        onClick={() => handleFunctionSelect('remove-bg')}
                        data-testid="back-to-remove-bg"
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

      {/* Футер с информацией */}
      <footer style={{
        textAlign: 'center',
        padding: '1rem',
        color: '#666',
        fontSize: '0.8rem',
        borderTop: '1px solid #eee',
        marginTop: '2rem'
      }}>
        <p>Remov'bl — сервис удаления фона с изображений</p>
        <p>Статус бэкенда: 
          <span style={{
            color: backendStatus === 'available' ? '#28a745' : 
                   backendStatus === 'checking' ? '#ffc107' : '#dc3545',
            fontWeight: 'bold',
            marginLeft: '5px'
          }}>
            {backendStatus === 'available' ? 'Доступен' : 
             backendStatus === 'checking' ? 'Проверка...' : 'Недоступен'}
          </span>
        </p>
      </footer>
    </div>
  );
}

export default App;