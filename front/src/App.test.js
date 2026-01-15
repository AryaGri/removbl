import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';

// Мокаем только необходимые функции
global.fetch = jest.fn();
global.URL.createObjectURL = jest.fn(() => 'mock-url');
global.URL.revokeObjectURL = jest.fn();

// Мокаем объект Blob
global.Blob = class {
  constructor() {
    this.size = 100;
    this.type = 'image/png';
  }
};

describe('App Component', () => {
  beforeEach(() => {
    // Настраиваем мок fetch для успешных ответов
    fetch.mockImplementation((url) => {
      if (url.includes('/docs')) {
        return Promise.resolve({ 
          ok: true, 
          status: 200 
        });
      }
      if (url.includes('/process')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: { 
            get: () => 'image/png' 
          },
          blob: () => Promise.resolve(new Blob())
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    // Мокаем глобальные функции
    window.URL.createObjectURL = jest.fn(() => 'mock-url');
    window.URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('1. Рендерит основной интерфейс приложения', async () => {
    await act(async () => {
      render(<App />);
    });
    
    // Проверка основных элементов
    expect(screen.getByTestId('app')).toBeInTheDocument();
    expect(screen.getByTestId('logo')).toHaveTextContent("remov'bl");
    expect(screen.getByTestId('nav-remove-bg')).toBeInTheDocument();
    expect(screen.getByTestId('nav-functions')).toBeInTheDocument();
    expect(screen.getByTestId('nav-profile')).toBeInTheDocument();
    expect(screen.getByTestId('user-avatar')).toBeInTheDocument();
  });

  test('2. Отображает основные UI элементы', async () => {
    await act(async () => {
      render(<App />);
    });
    
    // Проверяем все основные элементы
    expect(screen.getByTestId('page-title')).toBeInTheDocument();
    expect(screen.getByTestId('upload-section')).toBeInTheDocument();
    expect(screen.getByTestId('upload-area')).toBeInTheDocument();
    expect(screen.getByTestId('file-input')).toBeInTheDocument();
  });

  test('3. Переход на страницу профиля и возврат', async () => {
    await act(async () => {
      render(<App />);
    });
    
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

  test('4. Открытие и выбор функций из выпадающего меню', async () => {
    await act(async () => {
      render(<App />);
    });
    
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
    expect(screen.getByText('Страница находится в разработке')).toBeInTheDocument();
    
    // Возврат к удалению фона
    await act(async () => {
      fireEvent.click(screen.getByTestId('back-to-remove-bg'));
    });
    
    // Проверка возврата
    expect(screen.getByTestId('page-title')).toHaveTextContent('Обработка изображений');
  });

  test('5. Клик на область загрузки файлов', async () => {
    await act(async () => {
      render(<App />);
    });
    
    const uploadArea = screen.getByTestId('upload-area');
    
    // Кликаем на область загрузки
    await act(async () => {
      fireEvent.click(uploadArea);
    });
    
    // Проверяем, что input все еще присутствует
    expect(screen.getByTestId('file-input')).toBeInTheDocument();
  });

  test('6. Открытие и закрытие меню функций', async () => {
    await act(async () => {
      render(<App />);
    });
    
    const functionsButton = screen.getByTestId('nav-functions');
    
    // Открываем меню
    await act(async () => {
      fireEvent.click(functionsButton);
    });
    
    // Проверяем, что меню открылось
    expect(screen.getByTestId('functions-dropdown')).toBeInTheDocument();
    
    // Закрываем меню (кликаем снова)
    await act(async () => {
      fireEvent.click(functionsButton);
    });
    
    // Меню должно скрыться
    expect(screen.queryByTestId('functions-dropdown')).not.toBeInTheDocument();
  });

  test('7. Проверка drag over на области загрузки', async () => {
    await act(async () => {
      render(<App />);
    });
    
    const uploadArea = screen.getByTestId('upload-area');
    
    // Симулируем drag over
    await act(async () => {
      fireEvent.dragOver(uploadArea);
    });
    
    // Просто проверяем, что компонент не упал
    expect(uploadArea).toBeInTheDocument();
  });

  test('8. Переключение между функциями в меню', async () => {
    await act(async () => {
      render(<App />);
    });
    
    // Открываем меню
    await act(async () => {
      fireEvent.click(screen.getByTestId('nav-functions'));
    });
    
    // Выбираем функцию изменения формата
    await act(async () => {
      fireEvent.click(screen.getByTestId('function-format'));
    });
    
    // Проверяем, что перешли на страницу формата
    expect(screen.getByTestId('function-development')).toBeInTheDocument();
    
    // Используем более конкретный селектор для текста
    const formatTexts = screen.getAllByText(/Изменить формат/i);
    expect(formatTexts.length).toBeGreaterThan(0);
    
    // Проверяем текст в элементе "в разработке"
    const developmentText = screen.getByText(
      (content, element) => 
        element.tagName.toLowerCase() === 'p' && 
        content.includes('Функция "Изменить формат"')
    );
    expect(developmentText).toBeInTheDocument();
  });

  test('9. Загрузка файла и обработка (упрощенный тест)', async () => {
    // Настраиваем мок для обработки
    fetch.mockImplementation((url) => {
      if (url.includes('/process')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: { get: () => 'image/png' },
          blob: () => Promise.resolve(new Blob())
        });
      }
      return Promise.resolve({ ok: true });
    });

    await act(async () => {
      render(<App />);
    });

    // Создаем мок файла
    const file = new File(['test'], 'test.png', { type: 'image/png' });
    
    // Симулируем загрузку файла
    const fileInput = screen.getByTestId('file-input');
    
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });
    
    // Проверяем, что появилась кнопка обработки
    await waitFor(() => {
      expect(screen.getByTestId('process-button')).toBeInTheDocument();
    });
  });

  test('10. Отображение субтитров на главной странице', async () => {
    await act(async () => {
      render(<App />);
    });
    
    expect(screen.getByTestId('page-subtitle')).toHaveTextContent('Автоматически и бесплатно');
  });

  test('11. Проверка поддерживаемых форматов в тексте подсказки', async () => {
    await act(async () => {
      render(<App />);
    });
    
    // Проверяем, что отображаются правильные форматы
    const subtitle = screen.getByText(/JPG, JPEG, PNG, WEBP, AVIF до 10MB/i);
    expect(subtitle).toBeInTheDocument();
  });
});