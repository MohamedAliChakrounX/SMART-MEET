import { useCallback } from 'react';
import { useMeeting } from '../context/MeetingContext';
import { translations } from './translations';

function interpolate(template, vars = {}) {
    return Object.entries(vars).reduce(
        (acc, [key, value]) => acc.replaceAll(`{{${key}}}`, String(value)),
        template
    );
}

export function useI18n() {
    const { language } = useMeeting();
    const lang = language === 'FR' ? 'FR' : 'EN';
    const locale = lang === 'FR' ? 'fr-FR' : 'en-US';

    const t = useCallback((key, vars) => {
        const parts = key.split('.');
        let value = translations[lang];
        for (const part of parts) {
            value = value?.[part];
        }
        
        if (typeof value !== 'string') {
            console.warn(`[i18n] Missing translation for key: "${key}" in language: "${lang}"`);
            return key;
        }
        
        return interpolate(value, vars);
    }, [lang]);

    return { t, lang, locale };
}
