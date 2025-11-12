// backend/src/db.js  —— ESM 版本
import dotenv from 'dotenv';
import { MongoClient, ServerApiVersion } from 'mongodb';

// 先加载 backend/.env
dotenv.config();

// 你在 Atlas 里建的数据库名，比如 csci571_hw3
const DB_NAME = 'csci571_hw3';

let client;
let db;

export async function connectToDB() {
    if (db) return db;

    // 注意：在函数里再读取环境变量，确保已经被 dotenv 填好
    const uri = process.env.MONGODB_URI;

    if (!uri) {
        console.error('❌ 没有读到 MONGODB_URI 环境变量，请检查 backend/.env');
        throw new Error('MongoDB URI not set');
    }

    client = new MongoClient(uri, {
        serverApi: {
            version: ServerApiVersion.v1,
            strict: true,
            deprecationErrors: true,
        },
    });

    try {
        await client.connect();
        console.log('✅ Connected to MongoDB Atlas');
        db = client.db(DB_NAME);
        return db;
    } catch (err) {
        console.error('❌ Failed to connect to MongoDB:', err);
        throw err;
    }
}

export function getDb() {
    if (!db) {
        throw new Error('Database not initialized. Call connectToDB() first.');
    }
    return db;
}
