
const fs = require('fs');
const path = require('path');

class FileLogger {
    constructor() {
        const currentDate = new Date().toISOString().slice(0, 10);
        const logFolderPath = path.join(__dirname, '../../Logs');
        this.filePath = path.join(logFolderPath, `log_${currentDate}.txt`);

        // Create the log folder if it doesn't exist
        if (!fs.existsSync(logFolderPath)) {
            fs.mkdirSync(logFolderPath);
        }
    }

    log(type, message) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${type.toUpperCase()}] ${message}\n`;

        fs.appendFile(this.filePath, logMessage, (err) => {
            if (err) {
                console.error('Error writing to log file:', err);
            }
        });
    }

    info(message) {
        this.log('info', message);
    }

    debug(message) {
        this.log('debug', message);
    }

    error(message) {
        this.log('error', message);
    }
}

const fileLogger = new FileLogger();

module.exports = { fileLogger }



