import axios from 'axios';
import { withSessionRoute } from '../lib/session';

async function handler(req, res) {
  // Somente permitir método GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { code, state } = req.query;

    // Verificar se recebemos o código e o state
    if (!code || !state) {
      return res.redirect('/?error=missing_params');
    }

    // Verificar se o state corresponde ao que salvamos (previne CSRF)
    if (state !== req.session.oauthState) {
      return res.redirect('/?error=invalid_state');
    }

    // Limpar o state após a verificação
    req.session.oauthState = null;

    // Troca o código por um token de acesso
    const tokenResponse = await axios.post(
      'https://discord.com/api/oauth2/token',
      new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.DISCORD_REDIRECT_URI,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    // Buscar informações do usuário
    const userResponse = await axios.get('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    // Salvar informações importantes na sessão
    req.session.user = {
      id: userResponse.data.id,
      username: userResponse.data.username,
      discriminator: userResponse.data.discriminator,
      avatar: userResponse.data.avatar,
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: Date.now() + expires_in * 1000,
    };

    await req.session.save();

    // Redirecionar para o dashboard
    res.redirect('/dashboard.html');
  } catch (error) {
    console.error('Erro no callback:', error.response?.data || error.message);
    res.redirect('/?error=auth_failed');
  }
}

export default withSessionRoute(handler);