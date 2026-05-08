# Localization & Multi-Language Manual (v5.0.0)

This system is fully internationalized (i18n) and supports dynamic language switching for both the user interface and institutional reporting (PDF/CSV).

## 🌍 Supported Languages
Currently, the system is localized for:
- **English (US)** — Key: `en`
- **French (FR)** — Key: `fr`

---

## 🏗️ Architecture Overviews

### 1. Frontend (React)
The frontend uses the `react-i18next` library.
- **Location**: `client/src/i18n/`
- **Locales**: `client/src/i18n/locales/en.json` and `fr.json`
- **Usage**:
  ```tsx
  import { useTranslation } from 'react-i18next';
  const { t } = useTranslation();
  return <h1>{t('common.dashboard')}</h1>;
  ```

### 2. Backend (Node.js)
The backend uses a custom i18n service to support reporting.
- **Location**: `server/src/services/i18n.service.ts`
- **Locales**: `server/src/locales/en.json` and `fr.json`
- **Usage**:
  ```ts
  import { i18n } from '../services/i18n.service';
  const t = i18n.getFixedT(lang);
  doc.text(t('pdf.common.generated'));
  ```

---

## 🛠️ How to Add a New Language (e.g. Spanish)

### Step 1: Frontend Registration
1. Create `client/src/i18n/locales/es.json`.
2. Add the language to the `client/src/pages/SettingsHub.tsx` language picker.
3. Update `client/src/i18n/index.ts` to include the new resource.

### Step 2: Backend Registration
1. Create `server/src/locales/es.json`.
2. Ensure the JSON keys match the structure in `en.json`.
3. The `i18n.service.ts` will automatically load any new JSON files added to the `locales` directory.

---

## 📊 Localizing Reports (PDF/CSV)

When triggering an export from the frontend, the `lang` parameter must be propagated:

```ts
// Example: PDF Export Trigger
const handleExport = () => {
  const lang = i18n.language; // Get current active language
  window.location.href = `${API_URL}/export/pdf?lang=${lang}`;
};
```

---

## 🐛 Troubleshooting Text Expansion
French strings are typically 20-30% longer than English ones. When designing new UI components:
1. Avoid fixed-width containers for labels.
2. Use flexible grid systems (`grid`, `flex-wrap`).
3. Set appropriate `min-width` or `truncate` with tooltips for extremely long translations.

> [!TIP]
> Always verify the **Final Verdict** and **Payslip** PDFs after adding new translation keys, as these are the most layout-sensitive documents in the platform.
