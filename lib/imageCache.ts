// 全局图片缓存管理器
class ImageCacheManager {
  private cache = new Map<string, HTMLImageElement>();
  private loadingPromises = new Map<string, Promise<HTMLImageElement>>();

  async preloadImage(src: string): Promise<HTMLImageElement> {
    // 如果已缓存，直接返回
    if (this.cache.has(src)) {
      return this.cache.get(src)!;
    }

    // 如果正在加载，返回现有的 Promise
    if (this.loadingPromises.has(src)) {
      return this.loadingPromises.get(src)!;
    }

    // 开始加载
    const loadingPromise = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        // 加载成功，添加到缓存
        this.cache.set(src, img);
        this.loadingPromises.delete(src);
        resolve(img);
      };
      
      img.onerror = () => {
        // 加载失败，清理 loading 状态
        this.loadingPromises.delete(src);
        reject(new Error(`Failed to load image: ${src}`));
      };
      
      img.src = src;
    });

    this.loadingPromises.set(src, loadingPromise);
    return loadingPromise;
  }

  isLoaded(src: string): boolean {
    return this.cache.has(src);
  }

  isLoading(src: string): boolean {
    return this.loadingPromises.has(src);
  }

  // 批量预加载图片
  async preloadBatch(srcList: string[]): Promise<HTMLImageElement[]> {
    const promises = srcList.map(src => this.preloadImage(src));
    return Promise.all(promises);
  }

  // 清理缓存
  clear(): void {
    this.cache.clear();
    this.loadingPromises.clear();
  }

  // 获取缓存大小
  getCacheSize(): number {
    return this.cache.size;
  }
}

// 导出单例实例
export const imageCache = new ImageCacheManager();