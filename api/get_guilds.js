import axios from 'axios';
import { withSessionRoute, requireAuth } from '../lib/session';

async function handler(req, res) {
  // Somente permitir método GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // Verificar se o usuário está autenticado
  if (!await requireAuth(req, res)) {
    return; // requireAuth já respondeu com status 401
  }

  try {
    // Buscar a lista de servidores do usuário usando o token de acesso
    const { data: guilds } = await axios.get('https://discord.com/api/users/@me/guilds', {
      headers: {
        Authorization: `Bearer ${req.session.user.accessToken}`,
      },
    });

    // Filtrar apenas os servidores onde o usuário tem permissão de admin ou gerenciar servidor
    const ADMIN_PERMISSION = 0x8;
    const MANAGE_SERVER_PERMISSION = 0x20;

    const managedGuilds = guilds.filter(guild => {
      const permissions = parseInt(guild.permissions);
      return guild.owner || 
             (permissions & ADMIN_PERMISSION) === ADMIN_PERMISSION || 
             (permissions & MANAGE_SERVER_PERMISSION) === MANAGE_SERVER_PERMISSION;
    });

    res.status(200).json(managedGuilds);
  } catch (error) {
    console.error('Erro ao buscar servidores:', error.response?.data || error.message);
    
    // Verificar se o erro é devido a token expirado
    if (error.response?.status === 401) {
      req.session.destroy(); // Limpar sessão inválida
      return res.status(401).json({ error: 'Sessão expirada', redirect: '/api/auth_login' });
    }
    
    res.status(500).json({ error: 'Erro ao buscar seus servidores' });
  }
}

export default withSessionRoute(handler);