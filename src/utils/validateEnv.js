export function validateEnvironment() {
  const errors = [];
  const isProduction = process.env.NODE_ENV === 'production';

  // Check Node.js version
  const nodeVersion = parseInt(process.version.slice(1).split('.')[0]);
  if (nodeVersion < 20) {
    errors.push(`Node.js version 20 or higher required (current: ${process.version})`);
  }

  // Check API_KEY
  if (isProduction) {
    if (!process.env.API_KEY) {
      errors.push('API_KEY is required in production');
    } else if (process.env.API_KEY.length < 32) {
      errors.push('API_KEY must be at least 32 characters in production');
    }
  } else if (!process.env.API_KEY) {
    console.warn('WARNING: API_KEY not set (development mode)');
  }

  // Check WHATSAPP_SESSION_PATH
  if (!process.env.WHATSAPP_SESSION_PATH) {
    errors.push('WHATSAPP_SESSION_PATH is required');
  }

  // Handle validation errors
  if (errors.length > 0) {
    console.error('\nEnvironment validation failed:');
    errors.forEach(err => console.error(`  - ${err}`));
    
    if (isProduction) {
      console.error('\nExiting...');
      process.exit(1);
    } else {
      console.warn('\nContinuing in development mode...\n');
    }
  }
}
