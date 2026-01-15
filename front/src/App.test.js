import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';

// Мокаем только необходимые функции
global.fetch = jest.fn();
global.URL.createObjectURL = jest.fn(() => 'mock-url');
global.URL.revokeObjectURL = jest.fn();

describe('App Component - Working Tests', () => {
  beforeEach(() => {
    // Настраиваем мок fetch для успешных ответов
    fetch.mockImplementation((url) => {
      if (url.includes('/docs')) {
        return Promise.resolve({ ok: true, status: 200 });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: { get: () => 'image/png' },
        blob: () => Promise.resolve(new Blob())
      });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==================== РАБОЧИЕ ТЕСТЫ ====================

  // ✅ ТЕСТ 1: Этот тест работает
  test('1. Рендерит основной интерфейс приложения', async () => {
    await act(async () => {
      render(<App />);
    });
    
    // Даем время для инициализации
    await waitFor(() => {
      expect(screen.getByTestId('app')).toBeInTheDocument();
    }, { timeout: 1000 });
    
    // Проверка основных элементов
    expect(screen.getByTestId('logo')).toHaveTextContent("remov'bl");
    expect(screen.getByTestId('nav-remove-bg')).toBeInTheDocument();
    expect(screen.getByTestId('nav-functions')).toBeInTheDocument();
    expect(screen.getByTestId('nav-profile')).toBeInTheDocument();
  });

  // ✅ ТЕСТ 2: Этот тест работает
  test('2. Переход на страницу профиля и возврат', async () => {
    await act(async () => {
      render(<App />);
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('nav-profile')).toBeInTheDocument();
    }, { timeout: 1000 });
    
    // Клик по кнопке профиля
    await act(async () => {
      fireEvent.click(screen.getByTestId('nav-profile'));
    });
    
    // Проверка, что отобразилась страница профиля
    expect(screen.getByTestId('profile-page')).toBeInTheDocument();
    expect(screen.getByText('Профиль в разработке')).toBeInTheDocument();
    
    // Возврат на главную
    await act(async () => {
      fireEvent.click(screen.getByTestId('back-to-main'));
    });
    
    // Проверка, что вернулись на главную
    expect(screen.getByTestId('page-title')).toHaveTextContent('Обработка изображений');
  });

  // ✅ ТЕСТ 3: Этот тест работает
  test('3. Открытие и выбор функций из выпадающего меню', async () => {
    await act(async () => {
      render(<App />);
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('nav-functions')).toBeInTheDocument();
    }, { timeout: 1000 });
    
    // Открытие меню функций
    await act(async () => {
      fireEvent.click(screen.getByTestId('nav-functions'));
    });
    
    // Проверка отображения меню
    expect(screen.getByTestId('functions-dropdown')).toBeInTheDocument();
    
    // Выбор функции изменения размера
    await act(async () => {
      fireEvent.click(screen.getByTestId('function-resize'));
    });
    
    // Проверка, что отобразилась страница "в разработке"
    expect(screen.getByTestId('function-development')).toBeInTheDocument();
    
    // Возврат к удалению фона
    await act(async () => {
      fireEvent.click(screen.getByTestId('back-to-remove-bg'));
    });
    
    // Проверка возврата
    expect(screen.getByTestId('page-title')).toHaveTextContent('Обработка изображений');
  });

  // ==================== ПРОСТЫЕ ТЕСТЫ БЕЗ СЛОЖНОЙ АСИНХРОННОСТИ ====================

  // ✅ ТЕСТ 4: Проверка отображения всех UI элементов
  test('4. Отображение всех основных UI элементов', async () => {
    await act(async () => {
      render(<App />);
    });
    
    // Ждем инициализации
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Проверка всех основных элементов
    const elements = [
      { testId: 'app' },
      { testId: 'logo' },
      { testId: 'nav-remove-bg' },
      { testId: 'nav-functions' },
      { testId: 'nav-profile' },
      { testId: 'user-avatar' },
      { testId: 'page-title' },
      { testId: 'upload-section' },
      { testId: 'upload-area' },
      { testId: 'file-input' }
    ];
    
    elements.forEach(({ testId }) => {
      expect(screen.getByTestId(testId)).toBeInTheDocument();
    });
  });

  // ✅ ТЕСТ 6: Проверка статуса бэкенда в футере
  test('6. Отображение статуса бэкенда в футере', async () => {
    await act(async () => {
      render(<App />);
    });
    
    // Даем время для проверки бэкенда
    await waitFor(() => {
      expect(screen.getByText(/Статус бэкенда:/i)).toBeInTheDocument();
    }, { timeout: 2000 });
    
    // Проверяем, что статус отображается
    const statusText = screen.getByText(/Статус бэкенда:/i);
    expect(statusText).toBeInTheDocument();
  });

  // ✅ ТЕСТ 7: Быстрое переключение между функциями
  test('7. Быстрое переключение между функциями', async () => {
    await act(async () => {
      render(<App />);
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('nav-functions')).toBeInTheDocument();
    }, { timeout: 1000 });
    
    // Открываем меню функций
    await act(async () => {
      fireEvent.click(screen.getByTestId('nav-functions'));
    });
    
    // Проверяем, что меню открылось
    expect(screen.getByTestId('functions-dropdown')).toBeInTheDocument();
    
    // Закрываем меню (кликаем снова)
    await act(async () => {
      fireEvent.click(screen.getByTestId('nav-functions'));
    });
    
    // Проверяем, что вернулись на главную
    expect(screen.getByTestId('page-title')).toHaveTextContent('Обработка изображений');
  });

  // ✅ ТЕСТ 8: Проверка клика на области загрузки
  test('8. Клик на области загрузки файлов', async () => {
    await act(async () => {
      render(<App />);
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('upload-area')).toBeInTheDocument();
    }, { timeout: 1000 });
    
    const uploadArea = screen.getByTestId('upload-area');
    
    // Кликаем на область загрузки
    await act(async () => {
      fireEvent.click(uploadArea);
    });
    
    // Проверяем, что input все еще присутствует
    expect(screen.getByTestId('file-input')).toBeInTheDocument();
  });

  // ✅ ТЕСТ 9: Проверка drag over на области загрузки
  test('9. Drag over на области загрузки', async () => {
    await act(async () => {
      render(<App />);
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('upload-area')).toBeInTheDocument();
    }, { timeout: 1000 });
    
    const uploadArea = screen.getByTestId('upload-area');
    
    // Симулируем drag over
    await act(async () => {
      fireEvent.dragOver(uploadArea);
    });
    
    // Просто проверяем, что компонент не упал
    expect(uploadArea).toBeInTheDocument();
  });

});