// app.js
const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4242;

// Middleware para servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

//ejs
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'view'));

//Sistema de cookies
const cookieParser = require('cookie-parser');
app.use(cookieParser());


// Rotas
const indexRoutes = require('./routes/route.js');
app.use('/', indexRoutes);

const getConnection = require('./config/db');

// Teste de conexão ao iniciar o app
getConnection()
  .then(async (conn) => {
    console.log('✅ Banco conectado com sucesso ao iniciar o app.');
    const [rows] = await conn.query('SELECT NOW() AS agora');
    console.log('🕒 Hora atual do banco:', rows[0].agora);
    await conn.end();
  })
  .catch((err) => {
    console.error('❌ Erro ao conectar com o banco ao iniciar o app:', err.message);
  });

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`QR Mail 42 rodando em http://localhost:${PORT}`);
});
