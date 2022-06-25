import express from 'express';
import cors from 'cors';

const app = express(); // Cria um servidor
app.use(cors());
app.use(express.json()); // Permite a interpretacao de JSON

// Configura uma função pra ser executada quando bater um GET na rota "/"
app.get("/", (req, res) => {

});

// Configura o servidor para rodar na porta 5000
app.listen(5000);