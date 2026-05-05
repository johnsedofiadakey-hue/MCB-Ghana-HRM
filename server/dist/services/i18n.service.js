"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.i18n = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class I18nService {
    constructor() {
        this.locales = {};
        this.loadLocales();
    }
    loadLocales() {
        const isProd = fs_1.default.existsSync(path_1.default.join(__dirname, '../../dist'));
        const baseDir = isProd ? path_1.default.join(__dirname, '../../') : path_1.default.join(__dirname, '../');
        const localesDir = path_1.default.join(baseDir, 'locales');
        if (!fs_1.default.existsSync(localesDir)) {
            console.warn(`[I18nService] Locales directory not found at: ${localesDir}`);
            // Try a secondary fallback for Render/Production environments
            const rootFallback = path_1.default.join(process.cwd(), 'src/locales');
            if (fs_1.default.existsSync(rootFallback)) {
                this.loadLocalesFromDir(rootFallback);
            }
            return;
        }
        this.loadLocalesFromDir(localesDir);
    }
    loadLocalesFromDir(dir) {
        const files = fs_1.default.readdirSync(dir);
        files.forEach(file => {
            if (file.endsWith('.json')) {
                const lang = file.replace('.json', '');
                const content = fs_1.default.readFileSync(path_1.default.join(dir, file), 'utf8');
                this.locales[lang] = JSON.parse(content);
            }
        });
        console.log(`[I18nService] Loaded locales for: ${Object.keys(this.locales).join(', ')}`);
    }
    translate(key, lang = 'en') {
        const dict = this.locales[lang] || this.locales['en'] || {};
        const keys = key.split('.');
        let result = dict;
        for (const k of keys) {
            if (result && typeof result === 'object' && k in result) {
                result = result[k];
            }
            else {
                // As requested: professional output, no dots
                return key.split('.').pop()?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || key;
            }
        }
        return typeof result === 'string' ? result : key;
    }
}
exports.i18n = new I18nService();
