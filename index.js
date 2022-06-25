import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import joi from 'joi';
import dayjs from 'dayjs';

dotenv.config();

const app = express(); // Cria um servidor
app.use(cors());
app.use(express.json()); // Permite a interpretacao de JSON

const mongoClient = new MongoClient(process.env.MONGO_ADDRESS);
let db;

const participantSchema = joi.object({
    name: joi.string().required(),
});

mongoClient.connect().then(() => {
    db = mongoClient.db("BatePapoUol");
})

app.post("/participants", (req, res) => {
    const participant = req.body;
    const validate = participantSchema.validate(participant);

    if (validate.error) {
        res.sendStatus(422);
    } else {
        participant.lastStatus = Date.now();
        db.collection("participants").findOne({ name: participant.name }).then(user => {
            if (user === null) {
                db.collection("participants").insertOne(participant).then(() => {
                    db.collection("messages").insertOne(
                        {
                            from: participant.name,
                            to: 'Todos',
                            text: 'entra na sala...',
                            type: 'status',
                            time: new Date().toLocaleTimeString()
                        }).then(() => {
                            res.sendStatus(201);
                        })
                })
            } else {
                console.log("User ja cadastrado!");
                res.sendStatus(409);
            }
        });
    }
});

app.get("/participants", (req, res) => {
    
});

// Configura o servidor para rodar na porta 5000
app.listen(5000);