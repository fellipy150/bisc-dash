const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

// Servir os arquivos estáticos do public
app.use(express.static(path.join(__dirname, 'public')));

// Rota de autenticação
app.get('/api/auth_login', (req, res) => {
  // Aqui você coloca sua lógica de login com Discord
  res.redirect('https://discord.com/oauth2/authorize?...'); // substitua com sua URL de login
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
