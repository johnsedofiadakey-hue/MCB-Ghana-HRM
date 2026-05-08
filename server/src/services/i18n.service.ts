import fs from 'fs';
import path from 'path';

class I18nService {
  private locales: Record<string, any> = {};

  constructor() {
    this.loadLocales();
  }

  private loadLocales() {
    const isProd = fs.existsSync(path.join(__dirname, '../../dist'));
    const baseDir = isProd ? path.join(__dirname, '../../') : path.join(__dirname, '../');
    const localesDir = path.join(baseDir, 'locales');
    
    if (!fs.existsSync(localesDir)) {
      console.warn(`[I18nService] Locales directory not found at: ${localesDir}`);
      // Try a secondary fallback for Render/Production environments
      const rootFallback = path.join(process.cwd(), 'src/locales');
      if (fs.existsSync(rootFallback)) {
        this.loadLocalesFromDir(rootFallback);
      }
      return;
    }

    this.loadLocalesFromDir(localesDir);
  }

  private loadLocalesFromDir(dir: string) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      if (file.endsWith('.json')) {
        const lang = file.replace('.json', '');
        const content = fs.readFileSync(path.join(dir, file), 'utf8');
        this.locales[lang] = JSON.parse(content);
      }
    });
    console.log(`[I18nService] Loaded locales for: ${Object.keys(this.locales).join(', ')}`);
  }

  translate(key: string, lang: string = 'en'): string {
    const dict = this.locales[lang] || this.locales['en'] || {};
    const keys = key.split('.');
    
    let result = dict;
    for (const k of keys) {
      if (result && typeof result === 'object' && k in result) {
        result = result[k];
      } else {
        // As requested: professional output, no dots
        return key.split('.').pop()?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || key;
      }
    }

    return typeof result === 'string' ? result : key;
  }
}

export const i18n = new I18nService();
