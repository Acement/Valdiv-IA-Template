import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const mongoUser = process.env.MONGO_USER;
const mongoPass = process.env.MONGO_PASSWORD;
const mongoHost = process.env.MONGO_HOST;
const mongoPort = process.env.MONGO_PORT;
const mongoDb   = process.env.MONGO_DB;
const mongoAuthDb = process.env.MONGO_AUTH_DB;

const mongoUri = `mongodb://${mongoUser}:${encodeURIComponent(mongoPass)}@${mongoHost}:${mongoPort}/${mongoDb}?authSource=${mongoAuthDb}`;

const client = new MongoClient(mongoUri);

await client.connect();

console.log("✅ Conectado a MongoDB correctamente");
const chats_db = client.db(mongoDb);
export default chats_db;
