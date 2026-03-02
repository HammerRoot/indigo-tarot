import { useCallback, useState, useRef } from 'react';

interface UseImagePreloaderReturn {
  preloadImage: (src: string) => Promise<void>;
  isLoaded: (src: string) => boolean;
  isLoading: (src: string) => boolean;
  loadedImages: Set<string>;
}

export function useImagePreloader(): UseImagePreloaderReturn {
  // 使用 useRef 避免依赖数组问题
  const loadedImagesRef = useRef<Set<string>>(new Set());
  const loadingImagesRef = useRef<Set<string>>(new Set());
  const [, forceUpdate] = useState({});

  // 强制重新渲染的函数
  const triggerUpdate = () => forceUpdate({});

  const preloadImage = useCallback(async (src: string): Promise<void> => {
    // 如果已经加载过，直接返回
    if (loadedImagesRef.current.has(src)) {
      return Promise.resolve();
    }

    // 如果正在加载，返回现有的 Promise
    if (loadingImagesRef.current.has(src)) {
      return new Promise((resolve) => {
        const checkLoaded = () => {
          if (loadedImagesRef.current.has(src)) {
            resolve();
          } else {
            setTimeout(checkLoaded, 100);
          }
        };
        checkLoaded();
      });
    }

    // 开始预加载
    loadingImagesRef.current.add(src);
    triggerUpdate();

    try {
      await new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          loadedImagesRef.current.add(src);
          loadingImagesRef.current.delete(src);
          triggerUpdate();
          resolve();
        };
        img.onerror = () => {
          loadingImagesRef.current.delete(src);
          triggerUpdate();
          reject(new Error(`Failed to load image: ${src}`));
        };
        img.src = src;
      });
    } catch (error) {
      loadingImagesRef.current.delete(src);
      triggerUpdate();
      throw error;
    }
  }, []);

  const isLoaded = useCallback((src: string) => {
    return loadedImagesRef.current.has(src);
  }, []);

  const isLoading = useCallback((src: string) => {
    return loadingImagesRef.current.has(src);
  }, []);

  return {
    preloadImage,
    isLoaded,
    isLoading,
    loadedImages: loadedImagesRef.current,
  };
}