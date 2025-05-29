import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const connection = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '@Kachan2018', 
    database: 'adocao' ,
    port: 3306
});

export { connection };