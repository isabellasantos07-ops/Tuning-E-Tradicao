const express = require('express');
const db = require('../db');
const router = express.Router();

function validarProduto(body) {
  const erros = [];
  const nome = (body.nome || '').trim();
  const codigo_barras = (body.codigo_barras || '').trim();
  const id_categoria = Number(body.id_categoria);
  const preco_custo = Number(body.preco_custo);
  const preco_venda = Number(body.preco_venda);
  const quantidade_estoque = Number(body.quantidade_estoque);
  const estoque_minimo = Number(body.estoque_minimo);

  if (!nome) erros.push('Nome do produto nao pode ficar em branco.');
  if (!codigo_barras) erros.push('Codigo de barras nao pode ficar em branco.');
  if (!id_categoria) erros.push('Categoria e obrigatoria.');
  if (Number.isNaN(preco_custo) || preco_custo < 0) erros.push('Preco de custo nao pode ser negativo.');
  if (Number.isNaN(preco_venda) || preco_venda < 0) erros.push('Preco de venda nao pode ser negativo.');
  if (Number.isNaN(quantidade_estoque) || quantidade_estoque < 0) erros.push('Quantidade em estoque invalida.');
  if (Number.isNaN(estoque_minimo) || estoque_minimo < 0) erros.push('Estoque minimo invalido.');

  return {
    erros,
    dados: {
      nome,
      descricao: (body.descricao || '').trim() || null,
      codigo_barras,
      id_categoria,
      preco_custo,
      preco_venda,
      quantidade_estoque,
      estoque_minimo
    }
  };
}

router.get('/', async (req, res) => {
  const [linhas] = await db.query(`
    SELECT p.*, c.nome AS nome_categoria
    FROM produto p
    JOIN categoria c ON c.id_categoria = p.id_categoria
    ORDER BY p.nome
  `);
  res.json(linhas);
});

router.get('/:id', async (req, res) => {
  const [linhas] = await db.query(`
    SELECT p.*, c.nome AS nome_categoria
    FROM produto p
    JOIN categoria c ON c.id_categoria = p.id_categoria
    WHERE p.id_produto = ?
  `, [req.params.id]);
  if (!linhas.length) return res.status(404).json({ erro: 'Produto nao encontrado.' });
  res.json(linhas[0]);
});

router.post('/', async (req, res) => {
  const { erros, dados } = validarProduto(req.body);
  if (erros.length) return res.status(400).json({ erros });
  const [r] = await db.query(
    `INSERT INTO produto
    (id_categoria, nome, descricao, codigo_barras, preco_custo, preco_venda, quantidade_estoque, estoque_minimo)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [dados.id_categoria, dados.nome, dados.descricao, dados.codigo_barras, dados.preco_custo, dados.preco_venda, dados.quantidade_estoque, dados.estoque_minimo]
  );
  res.status(201).json({ mensagem: 'Produto criado.', id_produto: r.insertId });
});

router.put('/:id', async (req, res) => {
  const { erros, dados } = validarProduto(req.body);
  if (erros.length) return res.status(400).json({ erros });
  const [r] = await db.query(
    `UPDATE produto SET id_categoria=?, nome=?, descricao=?, codigo_barras=?, preco_custo=?, preco_venda=?, quantidade_estoque=?, estoque_minimo=?
     WHERE id_produto=?`,
    [dados.id_categoria, dados.nome, dados.descricao, dados.codigo_barras, dados.preco_custo, dados.preco_venda, dados.quantidade_estoque, dados.estoque_minimo, req.params.id]
  );
  if (!r.affectedRows) return res.status(404).json({ erro: 'Produto nao encontrado.' });
  res.json({ mensagem: 'Produto atualizado.' });
});

router.delete('/:id', async (req, res) => {
  const [itens] = await db.query('SELECT id_item_venda FROM item_venda WHERE id_produto = ? LIMIT 1', [req.params.id]);
  if (itens.length) return res.status(400).json({ erro: 'Nao da para excluir: produto ja usado em venda.' });
  const [r] = await db.query('DELETE FROM produto WHERE id_produto = ?', [req.params.id]);
  if (!r.affectedRows) return res.status(404).json({ erro: 'Produto nao encontrado.' });
  res.json({ mensagem: 'Produto excluido.' });
});

module.exports = router;
