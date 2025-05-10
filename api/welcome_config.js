import axios from 'axios';
import { withSessionRoute, requireAuth } from '../lib/session';
import { getCollection } from '../lib/mongodb';

async function handler(req, res) {
  // Verificar se o usuário está autenticado
  if (!await requireAuth(req, res)) {
    return; // requireAuth já respondeu com status 401
  }

  // Obter o ID do servidor da query
  const { guildId } = req.query;
  if (!guildId) {
    return res.status(400).json({ error: 'ID do servidor não fornecido' });
  }

  try {
    // Verificar se o usuário tem permissão para gerenciar este servidor
    const { data: guilds } = await axios.get('https://discord.com/api/users/@me/guilds', {
      headers: {
        Authorization: `Bearer ${req.session.user.accessToken}`,
      },
    });

    // Filtrar apenas os servidores onde o usuário tem permissão de admin ou gerenciar servidor
    const ADMIN_PERMISSION = 0x8;
    const MANAGE_SERVER_PERMISSION = 0x20;

    const guild = guilds.find(g => g.id === guildId);
    
    if (!guild) {
      return res.status(404).json({ error: 'Servidor não encontrado' });
    }

    const permissions = parseInt(guild.permissions);
    const hasPermission = guild.owner || 
                         (permissions & ADMIN_PERMISSION) === ADMIN_PERMISSION || 
                         (permissions & MANAGE_SERVER_PERMISSION) === MANAGE_SERVER_PERMISSION;
    
    if (!hasPermission) {
      return res.status(403).json({ error: 'Você não tem permissão para gerenciar este servidor' });
    }

    // Acessar a coleção de configurações
    const collection = await getCollection('serverConfigs');

    // Método GET: Buscar configuração existente
    if (req.method === 'GET') {
      const config = await collection.findOne({ guildId });
      return res.status(200).json(config || { guildId, welcomeEnabled: false });
    }
    
    // Método POST: Atualizar configuração
    else if (req.method === 'POST') {
      const { welcomeEnabled, welcomeChannelId, welcomeMessage } = req.body;
      
      if (welcomeEnabled === undefined) {
        return res.status(400).json({ error: 'Parâmetro welcomeEnabled é obrigatório' });
      }

      // Se estiver habilitando o sistema de boas-vindas, precisa fornecer canal e mensagem
      if (welcomeEnabled && (!welcomeChannelId || !welcomeMessage)) {
        return res.status(400).json({ 
          error: 'Canal e mensagem de boas-vindas são obrigatórios quando o sistema está ativado' 
        });
      }

      // Atualizar ou inserir (upsert) a configuração
      const result = await collection.updateOne(
        { guildId },
        { 
          $set: { 
            guildId,
            welcomeEnabled,
            welcomeChannelId: welcomeEnabled ? welcomeChannelId : null,
            welcomeMessage: welcomeEnabled ? welcomeMessage : null,
            updatedAt: new Date(),
            updatedBy: req.session.user.id
          } 
        },
        { upsert: true }
      );

      return res.status(200).json({ 
        success: true, 
        message: 'Configuração de boas-vindas atualizada com sucesso',
        updated: result.modifiedCount > 0,
        created: result.upsertedCount > 0
      });
    }
    
    // Outros métodos não são permitidos
    else {
      return res.status(405).json({ error: 'Método não permitido' });
    }
  } catch (error) {
    console.error('Erro na configuração de boas-vindas:', error);
    res.status(500).json({ error: 'Erro ao processar a configuração de boas-vindas' });
  }
}

export default withSessionRoute(handler);