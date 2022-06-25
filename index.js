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

const headerSchema = joi.string().required();

const messageSchema = joi.object({
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.string().valid('message', 'private_message').required()
})

mongoClient.connect().then(() => {
    db = mongoClient.db("BatePapoUol");
})

app.post("/participants", async (req, res) => {
    const participant = req.body;
    const validate = participantSchema.validate(participant);

    if (validate.error) {
        res.sendStatus(422);
    } else {
        participant.lastStatus = Date.now();
        const user = await db.collection("participants").findOne({ name: participant.name })
            
        if (user === null) {
            db.collection("participants").insertOne(participant);
            db.collection("messages").insertOne({ from: participant.name, to: 'Todos', text: 'entra na sala...', type: 'status', time: new Date().toLocaleTimeString() });
            res.sendStatus(201);
        } else {
            res.sendStatus(409);
        }
    }
});

app.get("/participants", async (req, res) => {

    const participants = await db.collection("participants").find().toArray();
    res.send(participants);
});

app.post("/messages", async (req, res) => {

    const sender = req.headers['user'];

    const validateHeader = headerSchema.validate(sender);

    if(validateHeader.error){
        res.sendStatus(422);
    }

    const user = await db.collection("participants").findOne({ name: sender.toString() })

    if (user === null){
        res.sendStatus(422);
    }else{
        const validate = messageSchema.validate(req.body);
        if(validate.error){
            res.sendStatus(422);
        }else{
            const messageReceived = await db.collection("messages").insertOne({from: sender.toString(), ...req.body, time: new Date().toLocaleTimeString()});
            res.sendStatus(201);
        }
    }

});

app.get("/messages", async (req, res) => {
    const limit = req.query.limit;
    const user = req.headers['user'];

    if(!limit){
        const messages = await db.collection("messages").find({$or: [{$or: [{to: (user)}, {type: 'message'}]}, {type: 'status'}]}).toArray();
        if(messages){
            res.send(messages);
        }
    }else{
        let messages = await db.collection("messages").find({$or: [{$or: [{to: (user)}, {type: 'message'}]}, {type: 'status'}, {from: user}]}).toArray();
        if(messages){
            res.send(messages);
        }  
    }
})

app.post("/status", async (req, res) => {
    
    const sender = req.headers['user'];

    const user = await db.collection("participants").findOne({ name: sender.toString() })
    if (user === null){
        res.sendStatus(404);
    }else{
        await db.collection("participants").updateOne({name : sender.toString()}, {$set: { lastStatus: Date.now()}})
        res.sendStatus(200);
    }

})


setInterval(() => {
    const timeNow = Date.now();

    db.collection("participants").find({lastStatus: { $lt: (timeNow - 10000) }}).toArray().then(inactiveUsers => {
        if(inactiveUsers.length === 0){
        }else{
            for(let i = 0; i < inactiveUsers.length; i++){
                db.collection("messages").insertOne({ from: inactiveUsers[i].name, to: 'Todos', text: 'sai da sala...', type: 'status', time: new Date().toLocaleTimeString() });
            }
            db.collection("participants").deleteMany({lastStatus: { $lt: (timeNow - 10000) }});
        }        
    });
    
}, 15000);

// Configura o servidor para rodar na porta 5000
app.listen(5000);