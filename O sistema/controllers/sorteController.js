const path = require('path');
const fs = require('fs');

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

function gerarNumerosDaSorte() {
  const numeros = new Set();
  while (numeros.size < 7) {
    numeros.add(Math.floor(Math.random() * 100));
  }
  return Array.from(numeros);
}

exports.exibirSorte = (req, res) => {
  const cookie = req.cookies['sorte_do_dia'];
  if (cookie) {
    const { frase, numeros } = JSON.parse(cookie);
    return res.render('sorte', { frase, numeros });
  }

  pegarSorteAleatoria((err, frase) => {
    if (err) return res.status(500).send(err);
    const numeros = gerarNumerosDaSorte();

    res.cookie('sorte_do_dia', JSON.stringify({ frase, numeros }), {
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true
    });

    res.render('sorte', { frase, numeros });
  });
};
