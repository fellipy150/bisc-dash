// bisc-dash/lib/mongodb.js
import { MongoClient } from 'mongodb';

// Variável para armazenar a conexão em cache
let cachedClient = null;
let cachedDb = null;

// Nome do banco de dados que você deseja usar
const dbName = 'biscbot';

export async function connectToDatabase() {
  // Se a conexão já estiver em cache, reutilize-a
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  // Verificar se a variável de ambiente está definida
  if (!process.env.MONGODB_URI) {
    throw new Error('Por favor, defina a variável de ambiente MONGODB_URI');
  }

  // Conectar ao cluster MongoDB
  const client = await MongoClient.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const db = client.db(dbName);

  // Armazenar conexão em cache
  cachedClient = client;
  cachedDb = db;

  return { client, db };
}

// Função para obter uma coleção específica
export async function getCollection(collectionName) {
  const { db } = await connectToDatabase();
  return db.collection(collectionName);
}