## Language
[中文版本](README.md)

# Web Certificate Management System

This is a Node.js-based web-based certificate management system that provides certificate generation, management, and export capabilities.

## Features

- Certificate generation and management
- Web interface operations
- Data import and export
- System monitoring
- Batch processing

## Tech stack

- Node.js
- Express.js
- CSV processing
- Certificate manipulation (node-forge)
- File compression (jszip)

## Installation

1. Make sure you have Node.js installed
2. Clone the project to your local computer
3. Install Dependencies:
```bash
npm install
```

## How to use

1. Start the server:
```bash
node index.js
```

2. Access to the system:
Default access interface 'http://localhost:9960/w'

## Project Structure

- '/certs' - The certificate store directory
- '/data' - The directory of data files
- '/html' - Front-end page
- '/js' - JavaScript file
- 'certificate.js' - The core logic of certificate processing
- 'index.js' - Application entry
- 'page.js' - Page routing
- 'settings.js' - System settings
- 'stop.js' - Interface access error

## Precautions

- Make sure that the system has the appropriate read and write permissions to the file while it is running
- It is recommended to back up certificates and data files regularly
- Keep the private key of the generated certificate safe


