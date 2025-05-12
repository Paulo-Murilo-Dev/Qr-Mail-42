const express = require('express');
const router = express.Router();
const path = require('path');
const mainController = require('../controllers/mainController');
const sorteController = require('../controllers/sorteController');
const getConnection = require('../config/db');


// Página inicial
const { registrarAcesso } = require('../controllers/mainController');

router.get('/', async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  try {
    await registrarAcesso({ route: 'home', ip });
  } catch (err) {
    console.error('Erro ao registrar acesso à home:', err);
  }

  res.render('home'); // sem extensão, Express procura home.ejs
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

// Sucesso de fixassão de mensagem
router.get('/mensagemEnviada/:code', async (req, res) => {
  const codigo = req.params.code;

  try {
    const db = await getConnection();

    const [qrResults] = await db.query(
      'SELECT id FROM qr_codes WHERE unique_id = ? LIMIT 1',
      [codigo]
    );
    if (qrResults.length === 0)
      return res.status(404).send('QR Code não encontrado.');

    const qrCodeId = qrResults[0].id;

    const [msgResults] = await db.query(
      `SELECT text_content, is_indexed
       FROM messages
       WHERE qr_code_id = ?
       ORDER BY submit_time DESC
       LIMIT 1`,
      [qrCodeId]
    );

    if (msgResults.length === 0 || msgResults[0].is_indexed === 0)
      return res.status(404).send('Mensagem não encontrada ou já foi destruída.');

    const mensagem = msgResults[0].text_content;
    res.render('mensagemEnviada', { codigo, mensagem });
  } catch (err) {
    console.error('Erro ao carregar mensagem:', err);
    res.status(500).send('Erro ao carregar mensagem.');
  }
});


module.exports = router;
