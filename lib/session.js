import { withIronSessionApiRoute, withIronSessionSsr } from 'iron-session/next';
import { serialize, parse } from 'cookie';

// Configuração da sessão
const sessionConfig = {
  password: process.env.SESSION_SECRET,
  cookieName: 'biscbot_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7 dias
    path: '/',
  },
};

// Função para proteger rotas de API com sessão
export function withSessionRoute(handler) {
  return withIronSessionApiRoute(handler, sessionConfig);
}

// Função para proteger páginas SSR com sessão
export function withSessionSsr(handler) {
  return withIronSessionSsr(handler, sessionConfig);
}

// Função auxiliar para criar cookies manualmente quando necessário
export function createSessionCookie(session) {
  const stringifiedSession = JSON.stringify(session);
  const encryptedSession = ''; // Você precisaria implementar criptografia aqui
  
  return serialize(sessionConfig.cookieName, encryptedSession, {
    ...sessionConfig.cookieOptions,
  });
}

// Função auxiliar para verificar se o usuário está autenticado
export async function isAuthenticated(req, res) {
  if (!req.session || !req.session.user || !req.session.user.accessToken) {
    return false;
  }
  
  // Aqui você pode adicionar verificação de token expirado se desejar
  
  return true;
}

// Função para garantir que o usuário esteja autenticado ou redirecionar
export async function requireAuth(req, res) {
  if (!await isAuthenticated(req, res)) {
    res.statusCode = 401;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ 
      error: 'Não autenticado',
      redirect: '/api/auth_login'
    }));
    return false;
  }
  return true;
}