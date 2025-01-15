# Web Certificate Management System

A Node.js-based web certificate management system that provides certificate generation, management, and export functionality.

## Features

- Certificate Generation and Management
- Web Interface Operations
- Data Import/Export
- System Monitoring
- Batch Processing

## Tech Stack

- Node.js
- Express.js
- CSV Processing
- Certificate Operations (node-forge)
- File Compression (jszip)

## Installation

1. Ensure Node.js is installed
2. Clone the project locally
3. Install dependencies:
```bash
npm install
```

## Usage

1. Start the server:
```bash
node index.js
```

2. Access the system:
Open your browser and visit `http://localhost:3000`

## Project Structure

- `/certs` - Certificate storage directory
- `/data` - Data files directory
- `/html` - Frontend pages
- `/js` - JavaScript files
- `certificate.js` - Core certificate processing logic
- `index.js` - Application entry point
- `page.js` - Page routing
- `settings.js` - System settings
- `stop.js` - Service termination

## Important Notes

- Ensure proper file read/write permissions when running the system
- Regular backup of certificates and data files is recommended
- Securely store generated certificate private keys

## License

MIT License

