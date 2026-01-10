import React, { useState } from 'react';
import './App.css';
import fixedImage from './second.png';

function App() {
  const [originalImage, setOriginalImage] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentView, setCurrentView] = useState('upload');
  const [isFunctionsOpen, setIsFunctionsOpen] = useState(false);
  const [selectedFunction, setSelectedFunction] = useState('remove-bg');

  // Проверка, выбрана ли функция удаления фона
  const isRemoveBgSelected = selectedFunction === 'remove-bg';

  const handleImageUpload = (event) => {
    // Если выбрана не основная функция, не обрабатываем загрузку
    if (!isRemoveBgSelected) return;
    
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const imageUrl = URL.createObjectURL(file);
      setOriginalImage({
        file,
        url: imageUrl
      });
      setCurrentView('processing');
      setProcessedImage(null);
    }
  };

  const handleProcessImage = () => {
    if (!originalImage || !isRemoveBgSelected) return;
    
    setIsProcessing(true);
    
    setTimeout(() => {
      const processedImageData = {
        file: null,
        url: fixedImage
      };
      
      setProcessedImage(processedImageData);
      setCurrentView('result');
      setIsProcessing(false);
    }, 3000);
  };

  const handleFunctionSelect = (functionName) => {
    setSelectedFunction(functionName);
    setIsFunctionsOpen(false);
    
    // Сбрасываем состояние при смене функции
    if (originalImage && originalImage.url) {
      URL.revokeObjectURL(originalImage.url);
    }
    
    setOriginalImage(null);
    setProcessedImage(null);
    setCurrentView('upload');
  };

  // Остальные функции без изменений...
  const handleNewImage = () => {
    if (originalImage && originalImage.url) {
      URL.revokeObjectURL(originalImage.url);
    }
    
    setOriginalImage(null);
    setProcessedImage(null);
    setCurrentView('upload');
  };

  const handleDownload = () => {
    if (!processedImage || !processedImage.url) return;

    const link = document.createElement('a');
    link.href = processedImage.url;
    link.download = `processed-image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  return (
    <div className="app">
      <main className="main-content">
        {/* Верхняя навигация без изменений */}
        <div className="top-navigation">
          <div className="nav-left">
            <div className="logo">remov'bl</div>
            <nav className="nav">
              <button className="nav-button active">{getFunctionDisplayName()}</button>
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
              <button className="nav-button">Профиль</button>
            </nav>
          </div>
          
          <img 
            src="/images/avatar.jpg" 
            alt="User" 
            className="user-photo"
          />
        </div>

        <div className="content-area">
          {/* Заголовок */}
          <div className="content-header">
            {isRemoveBgSelected ? (
              <>
                {currentView === 'upload' && <h1>Удаление фона на изображениях</h1>}
                {currentView === 'processing' && <h2>Удаление фона</h2>}
                {currentView === 'result' && <h2>Изображение готово!</h2>}
              </>
            ) : (
              <h1>{getFunctionDisplayName()}</h1>
            )}
            
            {currentView === 'upload' && isRemoveBgSelected && (
              <p className="subtitle">Автоматически и бесплатно</p>
            )}
          </div>

          {/* Основной контент */}
          <div className="content-main">
            {/* Если выбрана функция удаления фона */}
            {isRemoveBgSelected ? (
              <>
                {/* Экран загрузки */}
                {currentView === 'upload' && (
                  <div className="upload-section">
                    <div className="upload-area" onClick={() => document.getElementById('file-input').click()}>
                      <div className="upload-content">
                        <div className="upload-icon">📁</div>
                        <p className="upload-text">Выбрать изображение</p>
                        <p className="upload-subtext">PNG, JPG, JPEG до 10MB</p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        style={{ display: 'none' }}
                        id="file-input"
                      />
                    </div>
                  </div>
                )}

                {/* Экран обработки */}
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
                          Обработка...
                        </>
                      ) : (
                        'Удалить фон'
                      )}
                    </button>
                  </div>
                )}

                {/* Экран результата */}
                {currentView === 'result' && processedImage && originalImage && (
                  <div className="result-section">
                    <div className="comparison-container">
                      <div className="image-preview">
                        <h3>До</h3>
                        <div className="image-container">
                          <img 
                            src={originalImage.url} 
                            alt="Before"
                            className="preview-image"
                          />
                        </div>
                      </div>
                      <div className="image-preview">
                        <h3>После</h3>
                        <div className="image-container">
                          <img 
                            src={processedImage.url} 
                            alt="After"
                            className="preview-image"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="action-buttons">
                      <button className="download-button" onClick={handleDownload}>
                        Скачать
                      </button>
                      <button className="secondary-button" onClick={handleNewImage}>
                        Обработать другое изображение
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Страница "в разработке" для других функций */
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
        </div>
      </main>
    </div>
  );
}

export default App;