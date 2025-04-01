// src/api/axios.js - Конфигурация на Axios за API заявки
import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:8000/api',
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Добавяне на интерцептор за заявки, за да включи JWT токена във всички заявки
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Добавяне на интерцептор за отговори, за да обработва обновяването на токена
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Ако грешката не е 401 или заявката е била за обновяване на токена, отхвърлете
    if (!error.response || error.response.status !== 401 || originalRequest.url === '/token/refresh/') {
      return Promise.reject(error);
    }

    if (!isRefreshing) {
      isRefreshing = true;
      const refreshToken = localStorage.getItem('refresh');

      try {
        const response = await axios.post('http://localhost:8000/api/token/refresh/', {
          refresh: refreshToken
        });

        const { access } = response.data;
        localStorage.setItem('access', access);

        // Обновяване на заглавката Authorization на оригиналната заявка
        originalRequest.headers.Authorization = `Bearer ${access}`;
        
        // Обработка на всички заявки, които са били на опашка
        processQueue(null, access);
        
        return API(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        // Изчистване на токените и пренасочване към входа
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
        localStorage.removeItem('username');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Поставяне на неуспешната заявка на опашка
    return new Promise((resolve, reject) => {
      failedQueue.push({ resolve, reject });
    }).then(token => {
      originalRequest.headers.Authorization = `Bearer ${token}`;
      return API(originalRequest);
    }).catch(err => {
      return Promise.reject(err);
    });
  }
);

export default API;