require('dotenv').config({ path: '../.env' });
const mysql = require('mysql2/promise');

function getConnection() {
  const connectionConfig = {
    host: '127.0.0.1', // FORÇA TCP
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,

    
   
  };

  console.log('🔌 Tentando conectar com o banco usando:');
  console.log({
    host: connectionConfig.host,
    user: connectionConfig.user,
    database: connectionConfig.database,
    port: connectionConfig.port
  });

  return mysql.createConnection(connectionConfig).then((conn) => {
    console.log('✅ Conexão com o banco estabelecida com sucesso!');
    return conn;
  }).catch((err) => {
    console.error('❌ Falha ao conectar no banco de dados:', err.message);
    throw err;
  });
}

module.exports = getConnection;

