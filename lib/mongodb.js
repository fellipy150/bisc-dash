import { MongoClient } from 'mongodb';

// Variável para armazenar a conexão entre chamadas de função para evitar reconexões
let cachedClient = null;
let cachedDb = null;

export async function connectToDatabase() {
  // Se já temos uma conexão, reuse-a
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  // Verifica se a variável de ambiente existe
  if (!process.env.MONGODB_URI) {
    throw new Error('Por favor, defina a variável de ambiente MONGODB_URI');
  }

  // Cria nova conexão
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  
  const db = client.db('biscbot'); // Nome do banco de dados

  // Guarda a conexão para reutilização
  cachedClient = client;
  cachedDb = db;

  return { client, db };
}

export async function getCollection(collectionName) {
  const { db } = await connectToDatabase();
  return db.collection(collectionName);
}