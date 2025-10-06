const jwt = require('jsonwebtoken');

const payload = {
  id: '507f1f77bcf86cd799439011', // Example user id
};

const secret = 'neuroflow_production_secret_key_12345'; // Use same key as in your backend

const token = jwt.sign(payload, secret, { expiresIn: '1h' });

console.log('Generated JWT Token:');
console.log(token);
