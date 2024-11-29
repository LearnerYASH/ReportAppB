const Redis = require('ioredis');

// Create a Redis client instance
const redis = new Redis({
    host: '127.0.0.1', // Redis server address
    port: 6379,        // Default Redis port
    password: '',      // Set this if using a Redis service with a password
});

redis.on('connect', () => {
    console.log('Connected to Redis');
});

redis.on('error', (err) => {
    console.error('Redis error:', err);
});

module.exports = redis;
