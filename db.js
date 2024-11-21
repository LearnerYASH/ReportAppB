const sql = require('mssql');

const config = {
    user: 'dev',
    password: 'Dec@2021',
    database: 'iNextInhouseErp',
    server: '164.52.205.240',
    port: 22866,
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000,
    },
    options: {
        encrypt: true, // for Azure
        trustServerCertificate: true, // set to true for local dev / self-signed certs
    },
};

let poolPromise;

const connectToDB = async () => {
    if (!poolPromise) {
        poolPromise = new sql.ConnectionPool(config)
            .connect()
            .then((pool) => {
                console.log('Connected to the database successfully.');
                return pool;
            })
            .catch((err) => {
                poolPromise = null; // Reset if connection fails
                console.error('Database connection failed:', err.message);
            });
    }
    return poolPromise;
};

module.exports = {
    connectToDB,
    sql
};
