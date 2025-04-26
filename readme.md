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
* Executes a predefined Linux shell command upon finding a matching,