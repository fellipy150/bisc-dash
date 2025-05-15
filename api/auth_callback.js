// bisc-dash/api/auth_callback.js
import axios from 'axios';
import { withSessionRoute } from '../lib/session';

async function handler(req, res) {
  // Somente permitir método GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { code, state } = req.query;
    console.log('Callback - Recebido code:', code, 'state:', state);
    console.log('Callback - Session state:', req.session.oauthState);

    if (!code || !state) {
      console.error('Callback - Código ou estado ausente.');
      return res.redirect('/?error=missing_params');
    }

    if (state !== req.session.oauthState) {
      console.error('Callback - Estado inválido (CSRF).');
      req.session.oauthState = null; // Limpar mesmo em erro de state
      await req.session.save();
      return res.redirect('/?error=invalid_state');
    }
    req.session.oauthState = null; // Limpar state após verificação bem-sucedida

    const tokenParams = new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID,
      client_secret: process.env.DISCORD_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.DISCORD_REDIRECT_URI,
    });
    console.log('Callback - Parâmetros para troca de token:', tokenParams.toString());

    const tokenResponse = await axios.post(
      'https://discord.com/api/oauth2/token',
      tokenParams,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    console.log('Callback - Resposta da troca de token:', tokenResponse.data);
    
    // Obter os dados do token
    const { access_token, refresh_token, expires_in } = tokenResponse.data;
    
    // Buscar informações do usuário usando o token
    const userResponse = await axios.get('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });
    
    // Salvar os dados do usuário e token na sessão
    req.session.user = {
      ...userResponse.data,
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: Date.now() + expires_in * 1000,
    };

    await req.session.save(); // Certifique-se de que a sessão é salva após definir req.session.user
    console.log('Callback - Sessão salva, redirecionando para dashboard.');
    res.redirect('/dashboard.html');

  } catch (error) {
    console.error('Erro detalhado no callback:', error);
    if (error.response) {
      console.error('Callback - Erro na API do Discord:', error.response.data);
    }
    res.redirect('/?error=auth_failed');
  }
}

export default withSessionRoute(handler);