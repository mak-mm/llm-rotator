#!/usr/bin/env node

/**
 * Development server starter with dynamic port allocation
 */

const { spawn } = require('child_process');
const net = require('net');

// Configuration
const DEFAULT_PORT = 3000;
const MAX_PORT_ATTEMPTS = 50;

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Helper functions
const log = {
  info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}[WARNING]${colors.reset} ${msg}`),
  error: (msg) => console.error(`${colors.red}[ERROR]${colors.reset} ${msg}`),
};

// Check if a port is available
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        resolve(false);
      }
    });
    
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    
    server.listen(port);
  });
}

// Find the next available port
async function findAvailablePort(startPort) {
  let port = startPort;
  const maxPort = startPort + MAX_PORT_ATTEMPTS;
  
  while (port < maxPort) {
    const available = await isPortAvailable(port);
    if (available) {
      return port;
    }
    port++;
  }
  
  throw new Error(`No available ports found between ${startPort} and ${maxPort}`);
}

// Main function
async function startDev() {
  try {
    // Check if PORT is already set
    const requestedPort = process.env.PORT ? parseInt(process.env.PORT) : DEFAULT_PORT;
    
    log.info(`Checking port availability starting from ${requestedPort}...`);
    
    // Find available port
    const availablePort = await findAvailablePort(requestedPort);
    
    if (availablePort !== requestedPort) {
      log.warning(`Port ${requestedPort} is already in use`);
      log.success(`Using port ${availablePort} instead`);
    } else {
      log.success(`Port ${availablePort} is available`);
    }
    
    // Set environment variables
    process.env.PORT = availablePort.toString();
    
    // Print startup info
    console.log();
    log.info(`${colors.bright}Starting Next.js development server...${colors.reset}`);
    log.info(`Local:    ${colors.cyan}http://localhost:${availablePort}${colors.reset}`);
    log.info(`Network:  ${colors.cyan}http://0.0.0.0:${availablePort}${colors.reset}`);
    console.log();
    
    // Start Next.js dev server
    const next = spawn('next', ['dev', '--turbopack', '-p', availablePort.toString()], {
      stdio: 'inherit',
      env: {
        ...process.env,
        PORT: availablePort.toString(),
      },
    });
    
    // Handle process termination
    process.on('SIGINT', () => {
      log.info('Shutting down development server...');
      next.kill('SIGINT');
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      log.info('Shutting down development server...');
      next.kill('SIGTERM');
      process.exit(0);
    });
    
    next.on('error', (err) => {
      log.error(`Failed to start development server: ${err.message}`);
      process.exit(1);
    });
    
    next.on('exit', (code) => {
      if (code !== 0) {
        log.error(`Development server exited with code ${code}`);
      }
      process.exit(code);
    });
    
  } catch (error) {
    log.error(error.message);
    process.exit(1);
  }
}

// Run the script
startDev();