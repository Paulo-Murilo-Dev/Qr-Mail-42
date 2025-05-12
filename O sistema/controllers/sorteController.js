const path = require('path');
const fs = require('fs');

const registrarAcesso = require('./mainController').registrarAcesso || (() => {}); // fallback se necessário

// 🎲 Pega uma sorte aleatória do arquivo
function pegarSorteAleatoria(callback) {
  const filePath = path.join(__dirname, '../config/wordlistsorte.txt');
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) return callback('Erro ao ler lista de sorte.');
    const linhas = data.split('\n').filter(Boolean);
    if (linhas.length === 0) return callback('Lista de sorte vazia.');
    const sorte = linhas[Math.floor(Math.random() * linhas.length)];
    callback(null, sorte);
  });
}

// 🔢 Gera 7 números da sorte únicos entre 0–99
function gerarNumerosDaSorte() {
  const numeros = new Set();
  while (numeros.size < 7) {
    numeros.add(Math.floor(Math.random() * 100));
  }
  return Array.from(numeros);
}

// 🧠 Rota principal de exibição da sorte
exports.exibirSorte = async (req, res) => {
  const userIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  try {
    // 🧾 Se o usuário já tem um cookie de sorte, reutiliza
    const cookie = req.cookies['sorte_do_dia'];
    if (cookie) {
      const { frase, numeros } = JSON.parse(cookie);

      // 🛡️ Loga o acesso à rota "sorte"
      await registrarAcesso({ route: 'sorte', ip: userIp });

      return res.render('sorte', { frase, numeros });
    }

    // 🎴 Gera nova sorte se não houver cookie
    pegarSorteAleatoria(async (err, frase) => {
      if (err) return res.status(500).send(err);

      const numeros = gerarNumerosDaSorte();

      res.cookie('sorte_do_dia', JSON.stringify({ frase, numeros }), {
        maxAge: 24 * 60 * 60 * 1000, // 1 dia
        httpOnly: true
      });

      // 🛡️ Loga novo acesso também aqui
      await registrarAcesso({ route: 'sorte', ip: userIp });

      res.render('sorte', { frase, numeros });
    });
  } catch (err) {
    console.error('Erro na rota /sorte:', err);
    res.status(500).send('Erro ao gerar sorte.');
  }
};
