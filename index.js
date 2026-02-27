const express = require('express');
const axios = require('axios');
const cookieParser = require('cookie-parser');
const app = express();

app.use(cookieParser());

const TARGET_URL = "https://www.zenithummedia.com/case-studies?utm_source=google&utm_medium=medium&utm_campaign=NEW307&utm_id=Visit_frame";
const MEASUREMENT_ID = "G-SNCY0K36MC";

/**
 * Sends a single ping after a 90-second delay to 
 * "lock in" the session duration.
 */
async function finalizeSession(clientId, sessionId, userAgent) {
    const waitTime = 90000; // 90 Seconds

    // Wait silently in the background
    await new Promise(resolve => setTimeout(resolve, waitTime));

    const payload = new URLSearchParams({
        v: '2',
        tid: MEASUREMENT_ID,
        cid: clientId,
        sid: sessionId,
        en: 'session_end_ping', // A single custom event to mark the end time
        _et: waitTime.toString(), // Tells GA user was active for the 90s
        seg: '1',
        debug_mode: '1'
    });

    try {
        await axios.post(`https://www.google-analytics.com/g/collect?${payload.toString()}`, {}, {
            headers: { 'User-Agent': userAgent }
        });
        console.log("Session duration finalized at 90s.");
    } catch (err) {
        // Silent error handling
    }
}

app.all('*', (req, res) => {
    const gaCookie = req.cookies['_ga'] || '';
    const sessionCookie = req.cookies[`_ga_${MEASUREMENT_ID.slice(2)}`] || '';

    const clientId = gaCookie ? 
       gaCookie.split('.').slice(-2).join('.') : `100.${Date.now()}`;
    const sessionId = sessionCookie ? sessionCookie.split('.')[2] : Date.now().toString();
    const userAgent = req.headers['user-agent'] || 'Mozilla/5.0';

    // Start the timer - this won't send anything for 90 seconds
    finalizeSession(clientId, sessionId, userAgent);

    // Instant Redirect
    res.set({
        'Location': TARGET_URL,
        'Referrer-Policy': 'no-referrer',
        'Cache-Control': 'no-store, no-cache, must-revalidate'
    });
    res.status(307).send();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Traffic manager active on port ${PORT}`));