// server.js
require('dotenv').config(); // Load environment variables from .env file
const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const { authenticate } = require('@google-cloud/local-auth');
const { google } = require('googleapis');
const { exec } = require('child_process'); // For executing commands

// --- Configuration from .env ---
const ALLOWED_SENDER_EMAIL = process.env.ALLOWED_SENDER_EMAIL;
const EXPECTED_SUBJECT = process.env.EXPECTED_SUBJECT;
const COMMAND_TO_RUN = process.env.COMMAND_TO_RUN;
const CHECK_INTERVAL_MS = parseInt(process.env.CHECK_INTERVAL_MS || '60000', 10);
const SCOPES = [process.env.GMAIL_SCOPES];
const TOKEN_PATH = path.join(process.cwd(), process.env.TOKEN_PATH || 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), process.env.CREDENTIALS_PATH || 'credentials.json');
// --- End Configuration ---


/**
 * Reads previously authorized credentials from the save file.
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
    try {
        const content = await fs.readFile(TOKEN_PATH);
        const credentials = JSON.parse(content);
        return google.auth.fromJSON(credentials);
    } catch (err) {
        console.log('Token file not found or invalid.');
        return null;
    }
}

/**
 * Serializes credentials to a file compatible with GoogleAUth.fromJSON.
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client) {
    try {
        const content = await fs.readFile(CREDENTIALS_PATH);
        const keys = JSON.parse(content);
        const key = keys.installed || keys.web; // Depending on credentials type
        const payload = JSON.stringify({
            type: 'authorized_user',
            client_id: key.client_id,
            client_secret: key.client_secret,
            refresh_token: client.credentials.refresh_token,
        });
        await fs.writeFile(TOKEN_PATH, payload);
        console.log('Token stored to', TOKEN_PATH);
    } catch (err) {
        console.error('Error saving credentials:', err);
    }
}

/**
 * Load or request or authorization to call APIs.
 * @return {Promise<OAuth2Client>}
 */
async function authorize() {
    let client = await loadSavedCredentialsIfExist();
    if (client) {
        return client;
    }
    try {
        client = await authenticate({
            scopes: SCOPES,
            keyfilePath: CREDENTIALS_PATH,
        });
        if (client.credentials) {
            await saveCredentials(client);
        }
        return client;
    } catch (err) {
        console.error("Error during authentication:", err);
        process.exit(1); // Exit if authentication fails
    }
}

/**
 * Checks for new emails matching the criteria and executes the command.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
async function checkEmailsAndExecuteCommand(auth) {
    const gmail = google.gmail({ version: 'v1', auth });
    // Construct the query: unread, from specific sender, with specific subject
    const query = `is:unread from:"${ALLOWED_SENDER_EMAIL}" subject:"${EXPECTED_SUBJECT}"`;

    console.log(`${new Date().toISOString()} - Checking Gmail with query: ${query}`);

    try {
        const res = await gmail.users.messages.list({
            userId: 'me', // 'me' refers to the authenticated user
            q: query,
            maxResults: 5, // Limit results slightly just in case
        });

        const messages = res.data.messages;
        if (!messages || messages.length === 0) {
            // console.log('No new matching emails found.');
            return;
        }

        console.log(`Found ${messages.length} matching email(s).`);

        // Process the first found message (or loop if needed, but be careful)
        // We process one by one to ensure command runs and email gets marked read
        const messageId = messages[0].id;
        console.log(`- Processing Message ID: ${messageId}`);

        // --- Execute the command ---
        console.log(`Executing command: ${COMMAND_TO_RUN}`);
        exec(COMMAND_TO_RUN, (error, stdout, stderr) => {
            if (error) {
                console.error(`Command execution error: ${error.message}`);
                // Decide if you still want to mark as read or retry later
                // For now, we won't mark as read if the command fails
                return;
            }
            if (stderr) {
                console.warn(`Command execution stderr: ${stderr}`);
                // Continue even if there's stderr, might be informational
            }
            console.log(`Command execution stdout: ${stdout}`);

            // --- Mark email as read (if command execution was successful) ---
            console.log(`Marking email ${messageId} as read.`);
            gmail.users.messages.modify({
                userId: 'me',
                id: messageId,
                requestBody: {
                    removeLabelIds: ['UNREAD']
                }
            }).then(() => {
                console.log(`Email ${messageId} marked as read successfully.`);
            }).catch(err => {
                console.error(`Error marking email ${messageId} as read:`, err);
                // Log error, but the command already ran.
            });
        });

        // Optional: If you want to process *all* found messages in one check cycle,
        // you would loop here. However, executing commands rapidly based on multiple
        // emails might be risky. Processing one per check is often safer.

    } catch (err) {
        console.error('Error checking Gmail:', err.message || err);
        // Handle potential auth errors (e.g., token expiry if not automatically refreshed)
        if (err.code === 401) { // Unauthorized
             console.error("Authentication error. Token might be expired or revoked. Trying to re-authorize might be needed.");
             // Consider attempting re-authorization or exiting
        }
    }
}

/**
 * Main function to authorize and start the checking loop.
 */
async function main() {
    if (!ALLOWED_SENDER_EMAIL || !EXPECTED_SUBJECT || !COMMAND_TO_RUN) {
        console.error("Error: Please configure ALLOWED_SENDER_EMAIL, EXPECTED_SUBJECT, and COMMAND_TO_RUN in the .env file.");
        process.exit(1);
    }

    console.log("--- Gmail Command Runner ---");
    console.log(`Monitoring for emails from: ${ALLOWED_SENDER_EMAIL}`);
    console.log(`With subject: "${EXPECTED_SUBJECT}"`);
    console.log(`Command to run: ${COMMAND_TO_RUN}`);
    console.log(`Check interval: ${CHECK_INTERVAL_MS / 1000} seconds`);
    console.log("-----------------------------");

    try {
        const auth = await authorize();
        console.log("Authorization successful.");

        // Initial check
        await checkEmailsAndExecuteCommand(auth);

        // Set interval for periodic checks
        setInterval(() => checkEmailsAndExecuteCommand(auth), CHECK_INTERVAL_MS);

    } catch (error) {
        console.error("Failed to initialize:", error);
        process.exit(1);
    }
}

main();