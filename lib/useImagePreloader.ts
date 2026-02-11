import { useCallback, useState } from 'react';

interface UseImagePreloaderReturn {
  preloadImage: (src: string) => Promise<void>;
  isLoaded: (src: string) => boolean;
  isLoading: (src: string) => boolean;
  loadedImages: Set<string>;
}

export function useImagePreloader(): UseImagePreloaderReturn {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set());

  const preloadImage = useCallback((src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      // 如果已经加载过，直接返回
      if (loadedImages.has(src)) {
        resolve();
        return;
      }

      // 如果正在加载，等待加载完成
      if (loadingImages.has(src)) {
        const checkLoaded = () => {
          if (loadedImages.has(src)) {
            resolve();
          } else {
            setTimeout(checkLoaded, 50);
          }
        };
        checkLoaded();
        return;
      }

      // 开始预加载
      setLoadingImages(prev => new Set(prev).add(src));

      const img = new Image();
      img.onload = () => {
        setLoadedImages(prev => new Set(prev).add(src));
        setLoadingImages(prev => {
          const newSet = new Set(prev);
          newSet.delete(src);
          return newSet;
        });
        resolve();
      };
      img.onerror = () => {
        setLoadingImages(prev => {
          const newSet = new Set(prev);
          newSet.delete(src);
          return newSet;
        });
        reject(new Error(`Failed to load image: ${src}`));
      };
      img.src = src;
    });
  }, [loadedImages, loadingImages]);

  const isLoaded = useCallback((src: string) => {
    return loadedImages.has(src);
  }, [loadedImages]);

  const isLoading = useCallback((src: string) => {
    return loadingImages.has(src);
  }, [loadingImages]);

  return {
    preloadImage,
    isLoaded,
    isLoading,
    loadedImages,
  };
}