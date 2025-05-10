const getConnection = require('../config/db');
require('dotenv').config();
const fetch = require('node-fetch');

exports.exibirTarot = async (req, res) => {
  const prompt = req.cookies.tarot_prompt;
  let resposta = req.cookies.tarot_resposta;
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  if (prompt) {
    if (!resposta) {
      try {
        const systemPrompt = `
Você é uma taróloga piedosa e poderosa, especialista no Tarot de Marselha e baralhos ciganos. Seu bordão é "pobre alma...".
Responda com uma linguagem mística, simbólica e acolhedora. Vá direto à interpretação da(s) carta(s), sem explicar o que é tarot.
Use a leitura como um espelho da alma, mas seja prática: dê conselhos concretos, claros, diretos. Pode sugerir atitudes como "vá ao médico", "procure sua mãe", "diga o que sente".
Não fuja do humano: se perceber carência, ilusão, vício ou erro, diga com compaixão o que a alma precisa ouvir, não o que ela quer.
Quando a pergunta for de sim ou não, seja breve e incisiva.
Se sentir algo importante que não foi perguntado, traga à tona.
Nem tudo é espiritual. Às vezes está tudo certo, mas as coisas demoram. Você sabe disso. Diga isso.
Pode responder com negrito, itálico, sublinhado e com emojis para deixar ainda mais bonito.
        `;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: process.env.OPENAI_MODEL || 'gpt-4',
            messages: [
              { role: 'system', content: systemPrompt.trim() },
              { role: 'user', content: prompt }
            ],
            temperature: 0.8,
            max_tokens: 1000
          })
        });

        const data = await response.json();

        if (data.choices && data.choices.length > 0) {
          resposta = data.choices[0].message.content;
          res.cookie('tarot_resposta', resposta, { maxAge: 86400 * 1000, path: '/' });
        } else {
          resposta = '(Erro na resposta da IA)';
        }
      } catch (err) {
        resposta = '(Erro ao gerar resposta mística)';
      }

      const extrairCampo = (label, texto) => {
        const regex = new RegExp(`[*•\\s]*${label}\\*?:\\s*[*"]?(.*?)["\\n]`, 'i');
        const match = texto.match(regex);
        return match ? match[1].trim() : null;
      };

      const baralho = extrairCampo('Baralho', prompt);
      const tipo_leitura_raw = extrairCampo('Tipo de leitura', prompt);
      const objetivo = extrairCampo('Objetivo', prompt);
      const pergunta = extrairCampo('Pergunta', prompt);

      let quantidade_cartas = null;
      if (tipo_leitura_raw) {
        if (tipo_leitura_raw.toLowerCase().includes('cruz')) {
          quantidade_cartas = 10;
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
        
      }
    }

    return res.render('tarot', { promptSomente: true, promptSalvo: resposta });
  }

  res.render('tarot', { promptSomente: false, promptSalvo: null });
};
