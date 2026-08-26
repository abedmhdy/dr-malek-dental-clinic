import { useTranslation } from 'react-i18next';
import { changeLanguage, SUPPORTED_LANGUAGES } from '../../i18n';

const LABELS = { ar: 'العربية', he: 'עברית', en: 'English' };

export default function LanguageSwitcher({ className = '' }) {
  const { i18n } = useTranslation();

  return (
    <div className={`lang-switcher ${className}`}>
      {SUPPORTED_LANGUAGES.map((lang) => (
        <button
          key={lang}
          type="button"
          className={`lang-btn ${i18n.language === lang ? 'active' : ''}`}
          onClick={() => changeLanguage(lang)}
        >
          {LABELS[lang]}
        </button>
      ))}
    </div>
  );
}
