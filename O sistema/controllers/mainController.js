const path = require('path');
const getConnection = require('../config/db');

// 🛡️ Função para registrar o acesso à rota, com IP e QR opcional
const registrarAcesso = async ({ route, qrCodeId = null, ip }) => {
  try {
    const db = await getConnection();
    const logQuery = `INSERT INTO access_logs (route, qr_code_id, ip_address)
                      VALUES (?, ?, ?)`;
    await db.query(logQuery, [route, qrCodeId, ip]);
  } catch (err) {
    console.error('Erro ao registrar acesso:', err);
  }
};

// 📌 Exibe página de fixar mensagem, ou redireciona se já houver
exports.exibirFixador = async (req, res) => {
  const codigo = req.params.code;
  const userIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  try {
    const db = await getConnection();
    const [qrResults] = await db.query('SELECT id FROM qr_codes WHERE unique_id = ? LIMIT 1', [codigo]);
    if (qrResults.length === 0) return res.status(404).send(`<h1>QR Code "${codigo}" não encontrado.</h1>`);

    const qrCodeId = qrResults[0].id;
    const [msgResults] = await db.query('SELECT id FROM messages WHERE qr_code_id = ? LIMIT 1', [qrCodeId]);

    if (msgResults.length === 0) {
      return res.sendFile(path.join(__dirname, '../view/fixar.html'));
    } else {
      await registrarAcesso({ route: 'fixador', qrCodeId, ip: userIp });
      return res.redirect(`/v/${codigo}`);
    }
  } catch (err) {
    console.error(err);
    return res.status(500).send('Erro ao buscar dados.');
  }
};

// 📝 Salva uma nova mensagem vinculada ao QR
exports.salvarMensagem = async (req, res) => {
  const codigo = req.params.code;
  const mensagem = req.body.mensagem;
  const tema = parseInt(req.body.tema) || 1;
  const isSingleView = req.body.is_single_view ? 1 : null;

  if (!mensagem) return res.send('Mensagem inválida.');

  try {
    const db = await getConnection();
    const [qrResults] = await db.query('SELECT id FROM qr_codes WHERE unique_id = ? LIMIT 1', [codigo]);
    if (qrResults.length === 0) return res.status(404).send(`<h1>QR Code "${codigo}" não encontrado.</h1>`);

    const qrCodeId = qrResults[0].id;
    const insert = `
      INSERT INTO messages (qr_code_id, text_content, submit_time, is_destroyed, theme_id, is_single_view, is_indexed)
      VALUES (?, ?, NOW(), 0, ?, ?, 1)`;

    await db.query(insert, [qrCodeId, mensagem, tema, isSingleView]);
    res.redirect(`/mensagemEnviada/${codigo}`);

  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao salvar mensagem.');
  }
};

// 📩 Exibe a mensagem vinculada a um QR code
exports.visualizarMensagem = async (req, res) => {
  const codigo = req.params.code;
  const userIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  try {
    const db = await getConnection();
    const [qrResults] = await db.query('SELECT id FROM qr_codes WHERE unique_id = ? LIMIT 1', [codigo]);
    if (qrResults.length === 0) return res.status(404).send(`<h1>QR Code "${codigo}" não encontrado.</h1>`);

    const qrCodeId = qrResults[0].id;
    const [msgResults] = await db.query(
      'SELECT id, text_content, theme_id, is_single_view, is_indexed FROM messages WHERE qr_code_id = ? LIMIT 1',
      [qrCodeId]
    );

    if (msgResults.length === 0) return res.status(404).send('Mensagem não encontrada.');

    const { id, text_content, theme_id, is_single_view, is_indexed } = msgResults[0];

    if (is_indexed === 0 && is_single_view) {
      return res.render('mensagemAberta');
    }

    if (is_single_view && is_indexed === 1) {
      return res.render('confirmarAbertura', { codigo });
    }

    await registrarAcesso({ route: 'mensagem', qrCodeId, ip: userIp });
    res.render(`tema${theme_id || 1}`, { mensagem: text_content });

  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao buscar mensagem.');
  }
};

// ✅ Confirma visualização única e registra acesso
exports.confirmarAbertura = async (req, res) => {
  const codigo = req.params.code;
  const userIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  try {
    const db = await getConnection();
    const [qrResults] = await db.query('SELECT id FROM qr_codes WHERE unique_id = ? LIMIT 1', [codigo]);
    if (qrResults.length === 0) return res.status(404).send(`<h1>QR Code "${codigo}" não encontrado.</h1>`);

    const qrCodeId = qrResults[0].id;
    const [msgResults] = await db.query('SELECT id, text_content, theme_id FROM messages WHERE qr_code_id = ? LIMIT 1', [qrCodeId]);

    if (msgResults.length === 0) return res.status(404).send('Mensagem não encontrada.');

    const { id, text_content, theme_id } = msgResults[0];

    await db.query('UPDATE messages SET is_indexed = 0 WHERE id = ?', [id]);
    await registrarAcesso({ route: 'mensagem', qrCodeId, ip: userIp });

    res.render(`tema${theme_id || 1}`, { mensagem: text_content });

  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao confirmar abertura.');
  }
};

exports.registrarAcesso = registrarAcesso;
