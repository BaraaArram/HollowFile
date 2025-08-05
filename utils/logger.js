// Simple logger utility
function createLogger(name) {
  return {
    info: (message) => console.log(`[${name}] ${message}`),
    warn: (message) => console.warn(`[${name}] ${message}`),
    error: (message) => console.error(`[${name}] ${message}`),
    debug: (message) => console.log(`[${name}] DEBUG: ${message}`)
  };
}

const apiLogger = createLogger('API');
const resultLogger = createLogger('RESULT');

module.exports = {
  apiLogger,
  resultLogger
}; 