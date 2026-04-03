import { supabase } from './supabase';
import i18n from '../i18n';

/**
 * Syncs translations from Supabase to i18next resources.
 * This can be run on app load or scheduled daily.
 */
export const syncTranslations = async () => {
    try {
        console.log('Syncing translations from database...');
        const { data, error } = await supabase
            .from('translations')
            .select('key, en_val, si_val');

        if (error) throw error;

        if (data && data.length > 0) {
            const enResources = {};
            const siResources = {};

            data.forEach(({ key, en_val, si_val }) => {
                // Handle nested keys (e.g., "common.welcome")
                setNestedValue(enResources, key, en_val);
                setNestedValue(siResources, key, si_val);
            });

            // Update i18next resources
            i18n.addResourceBundle('en', 'translation', enResources, true, true);
            i18n.addResourceBundle('si', 'translation', siResources, true, true);

            console.log(`Successfully synced ${data.length} translation keys.`);
        }
    } catch (err) {
        // If the table doesn't exist (404), or we have a permission issue due to missing schema, log a quiet warning
        const isTableMissing = err.code === 'PGRST116' || 
                               err.status === 404 || 
                               err.message?.toLowerCase().includes('relation "translations" does not exist') ||
                               err.details?.toLowerCase().includes('relation "translations" does not exist');

        if (isTableMissing) {
            console.warn('Translations table not yet available in database. Using local language files.');
        } else {
            console.error('Failed to sync translations:', err);
        }
    }
};

/**
 * Helper to set value at a nested path in an object.
 */
function setNestedValue(obj, path, value) {
    const parts = path.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!current[part]) current[part] = {};
        current = current[part];
    }
    current[parts[parts.length - 1]] = value;
}
