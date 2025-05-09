const path = require('path');
const db = require('../config/db');

// Função auxiliar para registrar logs de acesso
const registrarAcesso = (qrCodeId, messageId, ip) => {
  const logQuery = `INSERT INTO access_logs (qr_code_id, message_id, ip_address, access_date)
                    VALUES (?, ?, ?, NOW())`;
  db.query(logQuery, [qrCodeId, messageId, ip], (err) => {
    if (err) console.error('Erro ao registrar acesso:', err);
  });
};

// Exibe formulário para fixar mensagem ou redireciona se mensagem já existe
exports.exibirFixador = (req, res) => {
  const codigo = req.params.code;
  const userIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  const queryQr = 'SELECT id FROM qr_codes WHERE unique_id = ? LIMIT 1';

  db.query(queryQr, [codigo], (err, qrResults) => {
    if (err || qrResults.length === 0) return res.status(404).send(`<h1>QR Code "${codigo}" não encontrado.</h1>`);

    const qrCodeId = qrResults[0].id;
    const queryMsg = 'SELECT id FROM messages WHERE qr_code_id = ? LIMIT 1';

    db.query(queryMsg, [qrCodeId], (err, msgResults) => {
      if (err) return res.status(500).send('Erro ao buscar mensagem.');

      if (msgResults.length === 0) {
        // Exibe o formulário para fixação se não houver mensagem
        res.sendFile(path.join(__dirname, '../view/fixar.html'));
      } else {
        // Redireciona para a visualização se já houver mensagem
        registrarAcesso(qrCodeId, msgResults[0].id, userIp);
        res.redirect(`/v/${codigo}`);
      }
    });
  });
};

// Salva a mensagem com opção de visualização única
exports.salvarMensagem = (req, res) => {
  const codigo = req.params.code;
  const mensagem = req.body.mensagem;
  const tema = parseInt(req.body.tema) || 1;
  const isSingleView = req.body.is_single_view ? 1 : null;

  if (!mensagem) return res.send('Mensagem inválida.');

  const queryQr = 'SELECT id FROM qr_codes WHERE unique_id = ? LIMIT 1';

  db.query(queryQr, [codigo], (err, qrResults) => {
    if (err || qrResults.length === 0) return res.status(404).send(`<h1>QR Code "${codigo}" não encontrado.</h1>`);

    const qrCodeId = qrResults[0].id;

    const insert = `
      INSERT INTO messages (qr_code_id, text_content, submit_time, is_destroyed, theme_id, is_single_view, is_indexed)
      VALUES (?, ?, NOW(), 0, ?, ?, 1)
    `;

    db.query(insert, [qrCodeId, mensagem, tema, isSingleView], (err) => {
      if (err) return res.status(500).send('Erro ao salvar mensagem.');

      res.send(`<h1>Mensagem salva com sucesso para o código ${codigo}</h1><p>${mensagem}</p>`);
    });
  });
};

// Exibe mensagem considerando visualização única e indexação
exports.visualizarMensagem = (req, res) => {
  const codigo = req.params.code;
  const userIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  const queryQr = 'SELECT id FROM qr_codes WHERE unique_id = ? LIMIT 1';

  db.query(queryQr, [codigo], (err, qrResults) => {
    if (err || qrResults.length === 0) return res.status(404).send(`<h1>QR Code "${codigo}" não encontrado.</h1>`);

    const qrCodeId = qrResults[0].id;
    const queryMsg = 'SELECT id, text_content, theme_id, is_single_view, is_indexed FROM messages WHERE qr_code_id = ? LIMIT 1';

    db.query(queryMsg, [qrCodeId], (err, msgResults) => {
      if (err || msgResults.length === 0) return res.status(404).send('Mensagem não encontrada.');

      const { id, text_content, theme_id, is_single_view, is_indexed } = msgResults[0];

      // Verifica se mensagem já foi aberta (indexado = 0)
      if (is_indexed === 0 && is_single_view) {
        return res.render('mensagemAberta');
      }

      // Se for single-view e ainda indexado, pede confirmação
      if (is_single_view && is_indexed === 1) {
        return res.render('confirmarAbertura', { codigo });
      }

      // Registra acesso e exibe mensagem
      registrarAcesso(qrCodeId, id, userIp);
      res.render(`tema${theme_id || 1}`, { mensagem: text_content });
    });
  });
};

// Confirma abertura e bloqueia futuras visualizações
exports.confirmarAbertura = (req, res) => {
  const codigo = req.params.code;
  const userIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  const queryQr = 'SELECT id FROM qr_codes WHERE unique_id = ? LIMIT 1';

  db.query(queryQr, [codigo], (err, qrResults) => {
    if (err || qrResults.length === 0) {
      return res.status(404).send(`<h1>QR Code "${codigo}" não encontrado.</h1>`);
    }

    const qrCodeId = qrResults[0].id;
    const queryMsg = 'SELECT id, text_content, theme_id FROM messages WHERE qr_code_id = ? LIMIT 1';

    db.query(queryMsg, [qrCodeId], (err, msgResults) => {
      if (err || msgResults.length === 0) {
        return res.status(404).send('Mensagem não encontrada.');
      }

      const { id, text_content, theme_id } = msgResults[0];

      // Agora desindexa a mensagem
      const updateIndexado = 'UPDATE messages SET is_indexed = 0 WHERE id = ?';

      db.query(updateIndexado, [id], (err) => {
        if (err) {
          console.error('Erro ao desindexar:', err);
          return res.status(500).send('Erro interno ao atualizar status.');
        }

        // Registra o acesso após desindexar
        registrarAcesso(qrCodeId, id, userIp);

        // Exibe diretamente a mensagem após confirmação
        res.render(`tema${theme_id || 1}`, { mensagem: text_content });
      });
    });
  });
};

