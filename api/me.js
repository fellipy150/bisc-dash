// bisc-dash/api/me.js
import { withSessionRoute } from '../lib/session.js';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  if (req.session.user && req.session.user.id) {
    // Retorna os dados do usuário da sessão
    res.status(200).json(req.session.user);
  } else {
    // Usuário não logado ou sessão inválida/expirada
    res.status(401).json({ error: 'Não autenticado' });
  }
}

export default withSessionRoute(handler);
