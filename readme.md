# Gmail Command Runner

A Node.js application that monitors a specified Gmail account for emails matching a specific sender and subject line. When such an email is detected, it executes a predefined command on the Linux server where the script is running.

---

## ⚠️ Security Warning ⚠️

**This project involves executing shell commands triggered by external input (email). This is inherently dangerous and carries significant security risks.**

* **Command Injection:** Although this script avoids using email *content* in the command, be extremely careful about the `COMMAND_TO_RUN` you configure.
* **Sender Spoofing:** While checking the 'From' address provides some protection, email senders can sometimes be spoofed.
* **Compromised Sender Account:** If the `ALLOWED_SENDER_EMAIL` account is compromised, an attacker could potentially trigger your command.
* **Command Safety:** Only configure commands that are absolutely necessary and have minimal potential for damage. Avoid commands like `rm -rf`, `sudo` (unless specifically configured for passwordless execution *with extreme caution*), or anything that modifies critical system files or user data without strict controls.
* **Principle of Least Privilege:** Run this Node.js script under a dedicated, low-privilege user account on your Linux server. Do not run it as root.

**Use this application responsibly and at your own risk. Understand the implications before deploying.**

---

## Features

* Monitors a Gmail account using the official Google Gmail API.
* Filters emails based on a specific sender address and subject line.
* Executes a predefined Linux shell command upon finding a matching, unread email.
* Uses OAuth 2.0 for secure authentication with Google.
* Marks the triggering email as read to prevent re-execution.
* Configurable check interval.
* Logs activity to both the console and a specified log file.

## Prerequisites

* **Node.js:** Version 14 or higher recommended.
* **npm:** Node Package Manager (usually comes with Node.js).
* **Linux Server:** A Linux environment where the script will run and execute commands.
* **Google Account:** A Gmail account to monitor.
* **Google Cloud Project:** You need to set up a project on Google Cloud Platform to enable the Gmail API and get credentials.

## Setup & Installation

1.  **Clone or Download:**
    Get the project files onto your Linux server. If it's a Git repository:
    ```bash
    git clone <your-repository-url>
    cd gmail-command-runner
    ```
    Otherwise, download the `server.js`, `package.json`, and create the `.env` file manually.

2.  **Install Dependencies:**
    Navigate to the project directory in your terminal and run:
    ```bash
    npm install
    ```

3.  **Google Cloud Project Setup:**
    * Go to the [Google Cloud Console](https://console.cloud.google.com/).
    * Create a new project or select an existing one.
    * Enable the **Gmail API** for your project (APIs & Services > Library).
    * Go to APIs & Services > Credentials.
    * Click "Create Credentials" > "OAuth client ID".
    * Configure the OAuth consent screen if you haven't already (User Type: External is fine for personal use; add your email as a test user).
    * Choose "Desktop app" as the Application type.
    * Give it a name (e.g., "Gmail Runner Client").
    * Click "Create".
    * **Download the JSON credentials file.** Rename it to `credentials.json` and place it in the root directory of this project.

4.  **Configure Environment Variables:**
    Create a file named `.env` in the project's root directory. Copy the following template and **fill in your specific details**:

    ```dotenv
    # .env file

    # --- Gmail Monitoring Config ---
    # Email address of the *sender* whose emails should trigger the command
    ALLOWED_SENDER_EMAIL=sender@example.com

    # Exact subject line to look for (case-sensitive)
    EXPECTED_SUBJECT="Execute My Special Command Now"

    # --- Command Execution ---
    # The exact linux command to execute when the email is found
    # EXAMPLE: Log to a file
    COMMAND_TO_RUN="echo \"Command triggered by email from ${ALLOWED_SENDER_EMAIL} on $(date)\" >> /home/user/logs/gmail_triggers.log"
    # EXAMPLE: Run a specific script (ensure it's executable: chmod +x script.sh)
    # COMMAND_TO_RUN="/path/to/your/safe_script.sh"
    # --- !!! BE EXTREMELY CAREFUL WITH THIS COMMAND !!! ---

    # --- Timing ---
    # How often to check for new emails (in milliseconds)
    CHECK_INTERVAL_MS=60000 # 60 seconds (adjust as needed, minimum recommended: 30000)

    # --- Google API ---
    # Scopes needed for reading and modifying (marking as read) emails
    GMAIL_SCOPES='[https://www.googleapis.com/auth/gmail.modify](https://www.googleapis.com/auth/gmail.modify)'
    # Path to store the token after authorization
    TOKEN_PATH='token.json'
    # Path to your downloaded credentials
    CREDENTIALS_PATH='credentials.json'

    # --- Logging ---
    # Path for the application log file
    LOG_FILE_PATH='./gmail-checker.log'
    ```

5.  **Protect Credentials:**
    Ensure your `.gitignore` file exists and includes `credentials.json`, `token.json`, `.env`, and `*.log` to prevent accidentally committing sensitive information.

## Running the Application

1.  **First Run (Authorization):**
    * Open a terminal in the project directory.
    * Run the script:
        ```bash
        node server.js
        ```
    * The script will output a URL. Copy this URL and open it in a web browser.
    * Log in to the Google Account you want the script to monitor.
    * Grant the application permission to access your Gmail (as defined by the scopes).
    * Google will provide an authorization code. Copy this code.
    * Paste the code back into the terminal where the script is running.
    * If successful, a `token.json` file will be created in your project directory. This stores the authorization token so you don't have to repeat this process often.
    * The script will then start monitoring your Gmail account.

2.  **Subsequent Runs:**
    Simply run the script again:
    ```bash
    node server.js
    ```
    It will load the credentials from `token.json` and start monitoring. Re-authorization is only needed if `token.json` is deleted or the token expires/is revoked.

3.  **Running in the Background (Recommended):**
    To keep the script running persistently (even after closing the terminal), use a process manager like `pm2` or configure it as a `systemd` service.

    * **Using `pm2`:**
        ```bash
        # Install pm2 globally (if you haven't already)
        sudo npm install pm2 -g

        # Navigate to your project directory
        cd /path/to/gmail-command-runner

        # Start the application with pm2
        pm2 start server.js --name gmail-checker

        # Optional: Save the pm2 process list to restart on reboot
        pm2 save

        # Optional: Configure pm2 to start on system boot
        pm2 startup
        # (Follow the instructions given by the pm2 startup command)
        ```
        * View logs: `pm2 logs gmail-checker`
        * Stop the app: `pm2 stop gmail-checker`
        * Restart the app: `pm2 restart gmail-checker`

## Logging

* The script logs its activities (checking emails, finding matches, executing commands, errors) to both the standard output (console) and a log file.
* The log file path is configured in the `.env` file via the `LOG_FILE_PATH` variable (defaults to `./gmail-checker.log`).
* You can monitor the log file in real-time using:
    ```bash
    tail -f ./gmail-checker.log
    ```
    (Or use `pm2 logs gmail-checker` if using pm2).

## License

This project is provided as-is. Please review the security warnings carefully before use. You are free to use, modify, and distribute it, but the author assumes no liability. Consider adding a specific open-source license (like MIT) if you plan broader distribution.