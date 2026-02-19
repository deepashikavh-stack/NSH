/**
 * SMS Notification Utility
 * 
 * TODO: Integrate with a real SMS gateway provider (e.g., Twilio, Vonage, or local provider).
 * For now, this utility logs the SMS details to the console to simulate sending.
 */

export const sendSMS = async (to, message) => {
    console.log('--- [SMS LOG START] ---');
    console.log(`To: ${to}`);
    console.log(`Message: ${message}`);
    console.log('--- [SMS LOG END] ---');

    // Example of how to integrate with a provider:
    /*
    const apiKey = import.meta.env.VITE_SMS_API_KEY;
    try {
        const response = await fetch('https://api.gateway.com/send', {
            method: 'POST',
            body: JSON.stringify({ to, message, apiKey })
        });
        return await response.json();
    } catch (error) {
        console.error('SMS Send Failed:', error);
        return null;
    }
    */

    return { success: true, status: 'logged' };
};
