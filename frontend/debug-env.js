require('dotenv').config();

console.log('Environment Check:');
console.log('ENCRYPTION_KEY exists:', !!process.env.ENCRYPTION_KEY);
console.log('ENCRYPTION_KEY length:', process.env.ENCRYPTION_KEY ? process.env.ENCRYPTION_KEY.length : 0);
console.log('NODE_ENV:', process.env.NODE_ENV);

if (process.env.ENCRYPTION_KEY) {
  console.log('First 10 chars:', process.env.ENCRYPTION_KEY.substring(0, 10) + '...');
}