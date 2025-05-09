const express = require('express');
const router = express.Router();
const path = require('path');
const mainController = require('../controllers/mainController');
const sorteController = require('../controllers/sorteController');

// Página inicial
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../view/home.html'));
});

// Rota especial do pão de mel da sorte
router.get('/sorte', sorteController.exibirSorte);

// Tarot rotas
const tarotController = require('../controllers/tarotController');
router.get('/tarot', tarotController.exibirTarot);

// Confirmação de mensagens únicas
router.post('/v/:code/confirmar', mainController.confirmarAbertura);

// Visualização de mensagens
router.get('/v/:code', mainController.visualizarMensagem);

// Fixação e envio de mensagens
router.get('/:code', mainController.exibirFixador);
router.post('/:code', mainController.salvarMensagem);

module.exports = router;
