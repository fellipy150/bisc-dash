import { withSessionRoute } from '../lib/session';

async function handler(req, res) {
  // Somente permitir método GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Destruir a sessão do usuário
    req.session.destroy();

    // Redirecionar para a página inicial
    res.redirect('/');
  } catch (error) {
    console.error('Erro no logout:', error);
    res.status(500).json({ error: 'Erro ao fazer logout' });
  }
}

export default withSessionRoute(handler);