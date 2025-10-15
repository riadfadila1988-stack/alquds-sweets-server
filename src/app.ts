import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './all-routes'
dotenv.config();

const app = express();

app.use(express.json());
app.use(cors());
app.use(routes);

app.get('/', (_req, res) => {
    res.send('Hello from TypeScript Express!');
});

export default app;