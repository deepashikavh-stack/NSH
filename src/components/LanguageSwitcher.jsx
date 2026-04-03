import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const LanguageSwitcher = ({ variant = 'default' }) => {
    const { i18n } = useTranslation();

    const toggleLanguage = () => {
        const newLang = i18n.language === 'en' ? 'si' : 'en';
        i18n.changeLanguage(newLang);
        localStorage.setItem('i18nextLng', newLang);
    };

    const isSinhala = i18n.language === 'si';

    const styles = {
        default: {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            backgroundColor: 'var(--glass-bg)',
            border: '1px solid var(--glass-border)',
            borderRadius: '20px',
            color: 'var(--text-main)',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: 600,
            transition: 'all 0.2s ease',
        },
        kiosk: {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 24px',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '30px',
            color: '#fff', // Keep white for kiosk as it usually has a dark/vibrant background
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: 700,
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
        }
    };

    return (
        <button
            onClick={toggleLanguage}
            style={styles[variant] || styles.default}
            className="hover-brighten"
        >
            <Globe size={variant === 'kiosk' ? 20 : 16} opacity={0.7} />
            <span style={{ display: 'flex', gap: '4px' }}>
                <span style={{ opacity: isSinhala ? 0.5 : 1 }}>EN</span>
                <span style={{ opacity: 0.3 }}>|</span>
                <span style={{ opacity: isSinhala ? 1 : 0.5 }}>සිං</span>
            </span>
        </button>
    );
};

export default LanguageSwitcher;
