import type { IStorageService } from '@/domain/interfaces';

const STORAGE_PREFIX = 'voice_chat_';

export class StorageService implements IStorageService {
  private storage: Storage;

  constructor(storage: Storage = localStorage) {
    this.storage = storage;
  }

  get<T>(key: string): T | null {
    try {
      const item = this.storage.getItem(STORAGE_PREFIX + key);
      if (!item) return null;
      return JSON.parse(item) as T;
    } catch {
      return null;
    }
  }

  set<T>(key: string, value: T): void {
    try {
      this.storage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
    } catch (error) {
      console.error('Failed to save to storage:', error);
    }
  }

  remove(key: string): void {
    this.storage.removeItem(STORAGE_PREFIX + key);
  }

  clear(): void {
    const keysToRemove: string[] = [];
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => this.storage.removeItem(key));
  }
}

// Singleton instance
let instance: StorageService | null = null;

export function getStorageService(): StorageService {
  if (!instance) {
    instance = new StorageService();
  }
  return instance;
}
