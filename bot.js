const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const sqlite3 = require('sqlite3').verbose();
const express = require('express');

// Configuración básica de Express para Railway
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Bot del Pan está en línea!');
});

app.listen(port, () => {
  console.log(`Servidor escuchando en puerto ${port}`);
});

// Base de datos para almacenar los pancoins
const db = new sqlite3.Database('pancoins.db', (err) => {
    if (err) console.error(err.message);
    else console.log('💾 Base de datos conectada.');
});

// Crear tabla si no existe
db.run(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, pancoins INTEGER DEFAULT 0)`);

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'] // Necesario para Railway
    }
});

client.on('qr', (qr) => {
    console.log('Escanea este código QR con WhatsApp para conectar el bot:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ Botsito del Pan está listo.');
});

client.on('message', async (msg) => {
    const chatId = msg.from;
    const args = msg.body.split(' ');
    const command = args.shift().toLowerCase();

    if (command === '#agregarpancoins') {
        let amount = parseInt(args[0]);
        let user = args[1] || msg.from;

        if (!amount || isNaN(amount)) return msg.reply('⚠️ Especifica una cantidad válida.');

        db.run('INSERT INTO users (id, pancoins) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET pancoins = pancoins + ?',
            [user, amount, amount], (err) => {
                if (err) console.error(err);
                msg.reply(`✅ Se han agregado ${amount} pancoins a ${user}.`);
            });
    }

    if (command === '#usarpancoins') {
        let amount = parseInt(args[0]);
        let user = args[1] || msg.from;

        if (!amount || isNaN(amount)) return msg.reply('⚠️ Especifica una cantidad válida.');

        db.get('SELECT pancoins FROM users WHERE id = ?', [user], (err, row) => {
            if (err) return console.error(err);
            if (!row || row.pancoins < amount) return msg.reply('❌ No tienes suficientes pancoins.');

            db.run('UPDATE users SET pancoins = pancoins - ? WHERE id = ?', [amount, user], (err) => {
                if (err) console.error(err);
                msg.reply(`✅ Has usado ${amount} pancoins. Ahora tienes ${row.pancoins - amount} pancoins.`);
            });
        });
    }
});

client.initialize();