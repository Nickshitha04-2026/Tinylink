

require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const db = require("./db.js");
const helmet = require('helmet');
const cors = require('cors');
const validUrl = require('valid-url');

const app = express();
app.use(helmet());
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const CODE_REGEX = /^[A-Za-z0-9]{6,8}$/;


app.get('/healthz', (req, res) => {
  res.json({ ok: true, version: '1.0' });
});


app.post('/api/links', async (req, res) => {
  try {
    const { target_url, code } = req.body;
    if (!target_url || !validUrl.isWebUri(target_url)) {
      return res.status(400).json({ error: 'Invalid or missing target_url' });
    }

  
    let finalCode = code;
    if (finalCode) {
      if (!CODE_REGEX.test(finalCode)) {
        return res.status(400).json({ error: 'Code must match [A-Za-z0-9]{6,8}' });
      }
    } else {
     
      finalCode = generateCode(7);
    }

   
    const insertQuery = `
      INSERT INTO links (code, target_url)
      VALUES ($1, $2)
      RETURNING code, target_url, clicks, last_clicked, created_at
    `;
    const values = [finalCode, target_url];
    try {
      const { rows } = await db.query(insertQuery, values);
      return res.status(201).json(rows[0]);
    } catch (err) {
      if (err.code === '23505' || err.constraint === 'links_pkey') {
        return res.status(409).json({ error: 'Code already exists' });
      }
      console.error(err);
      return res.status(500).json({ error: 'DB error' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


app.get('/api/links', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT code, target_url, clicks, last_clicked, created_at FROM links ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});


app.get('/api/links/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const { rows } = await db.query('SELECT code, target_url, clicks, last_clicked, created_at FROM links WHERE code = $1', [code]);
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});


app.delete('/api/links/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const { rowCount } = await db.query('DELETE FROM links WHERE code = $1', [code]);
    if (rowCount === 0) return res.status(404).json({ error: 'Not found' });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});


app.get('/:code', async (req, res, next) => {
  const { code } = req.params;
  if (!CODE_REGEX.test(code)) return next(); 
  try {
   
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      const selectRes = await client.query('SELECT target_url FROM links WHERE code = $1 FOR UPDATE', [code]);
      if (selectRes.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).send('Not found');
      }
      const target = selectRes.rows[0].target_url;
      await client.query('UPDATE links SET clicks = clicks + 1, last_clicked = now() WHERE code = $1', [code]);
      await client.query('COMMIT');
     
      return res.redirect(302, target);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(err);
      return res.status(500).send('Server error');
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    return res.status(500).send('Server error');
  }
});


app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

function generateCode(len = 7) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars.charAt(Math.floor(Math.random() * chars.length));
  return out;
}

app.listen(PORT, () => console.log(`TinyLink listening on ${PORT}`));

