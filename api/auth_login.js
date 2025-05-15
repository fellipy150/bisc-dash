// bisc-dash/api/auth_login.js
import { withSessionRoute } from '../lib/session.js';

// Função para gerar um state aleatório para segurança OAuth
function generateRandomState() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

async function handler(req, res) {
  // Somente permitir método GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Gerar e salvar estado aleatório na sessão para verificação posterior
    const state = generateRandomState();
    req.session.oauthState = state;
    await req.session.save();

    // Parâmetros necessários para a URL de autorização do Discord
    const params = new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID,
      redirect_uri: process.env.DISCORD_REDIRECT_URI,
      response_type: 'code',
      scope: 'identify email guilds', // Ajuste conforme necessário
      state: state
    });

    // Construir URL de autorização do Discord e redirecionar o usuário
    const authUrl = `https://discord.com/api/oauth2/authorize?${params.toString()}`;
    res.redirect(authUrl);
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro ao iniciar o processo de login' });
  }
}

export default withSessionRoute(handler);