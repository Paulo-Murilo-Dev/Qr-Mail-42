const fs = require('fs');
const readline = require('readline');
const getConnection = require('./db'); // Função que retorna a conexão

function lerCodigosDoArquivo(path) {
  if (!fs.existsSync(path)) {
    fs.writeFileSync(path, '');
    console.log('Arquivo lote.txt criado. Adicione códigos nele e execute novamente.');
    process.exit(0);
  }

  const conteudo = fs.readFileSync(path, 'utf-8');
  return conteudo.split('\n').map(l => l.trim()).filter(Boolean);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Digite o número do lote que deseja inserir: ', async (loteStr) => {
  rl.close();

  const batch = parseInt(loteStr);
  if (isNaN(batch)) {
    console.log('Lote inválido.');
    return;
  }

  const codigos = lerCodigosDoArquivo('lote.txt');
  if (codigos.length === 0) {
    console.log('Nenhum código encontrado no lote.txt');
    return;
  }

  try {
    const db = await getConnection();
    let inseridos = 0;

    for (const codigo of codigos) {
      try {
        await db.query(
          'INSERT INTO qr_codes (unique_id, batch, is_used) VALUES (?, ?, 0)',
          [codigo, batch]
        );
        inseridos++;
        console.log(`✅ Código ${codigo} inserido com sucesso.`);
      } catch (err) {
        console.error(`❌ Erro ao inserir código ${codigo}:`, err.sqlMessage || err);
      }
    }

    console.log(`\n🎉 ${inseridos} códigos inseridos com sucesso no lote ${batch}.`);
    await db.end();
  } catch (err) {
    console.error('❌ Erro ao conectar com o banco de dados:', err.message);
  }
});
