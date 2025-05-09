const getConnection = require('../config/db');

exports.exibirTarot = async (req, res) => {
  const prompt = req.cookies.tarot_prompt;
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  if (prompt) {
    const resposta = '(api desconectada)';

    const baralhoMatch = prompt.match(/Baralho: (.+)/);
    const leituraMatch = prompt.match(/Tipo de leitura: (.+)/);
    const objetivoMatch = prompt.match(/Objetivo: (.+)/);
    const perguntaMatch = prompt.match(/Pergunta: (.+)/);

    const baralho = baralhoMatch ? baralhoMatch[1] : null;
    const tipo_leitura_raw = leituraMatch ? leituraMatch[1] : null;
    const objetivo = objetivoMatch ? objetivoMatch[1] : null;
    const pergunta = perguntaMatch ? perguntaMatch[1] : null;

    let quantidade_cartas = null;
    if (tipo_leitura_raw) {
      if (tipo_leitura_raw.includes('Cruz')) {
        quantidade_cartas = -1;
      } else {
        const numMatch = tipo_leitura_raw.match(/(\d+)/);
        quantidade_cartas = numMatch ? parseInt(numMatch[1]) : null;
      }
    }

    try {
      const db = await getConnection();
      const query = `
        INSERT INTO tarot_logs (resposta, ip_address, pergunta, objetivo, baralho, quantidade_cartas)
        VALUES (?, ?, ?, ?, ?, ?)`;
      await db.query(query, [resposta, ip, pergunta, objetivo, baralho, quantidade_cartas]);
    } catch (err) {
      console.error('Erro ao salvar log de tarot:', err);
    }

    return res.render('tarot', { promptSomente: true, promptSalvo: prompt });
  }

  res.render('tarot', { promptSomente: false, promptSalvo: null });
};
