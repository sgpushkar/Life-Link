import en from '../messages/en.json';
import hi from '../messages/hi.json';
import mr from '../messages/mr.json';
import { useAppStore } from './store';

const dictionaries = { en, hi, mr };

export function useTranslation() {
  const language = useAppStore((s) => s.language);
  const dict = dictionaries[language] || dictionaries.en;

  const t = (path: string, fallback?: string): string => {
    const keys = path.split('.');
    let current: any = dict;
    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = current[k];
      } else {
        return fallback || path;
      }
    }
    return typeof current === 'string' ? current : fallback || path;
  };

  return { t, language };
}
