import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import bcrypt from 'bcrypt';


dotenv.config();
const app = express();
const APP_PORT = 5000;
app.use(cors({ origin: true }));

/** @see https://stackoverflow.com/a/71216204 */
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

const uri = 'mongodb+srv://daniel:12345@cluster0.le3lh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const client = new MongoClient(uri);

app.get('/', (_, res) => res.json({"Hello": "World", "Version": 2}));

app.listen(APP_PORT, () => {
    console.log(`api listening at http://localhost:${APP_PORT}`)
})


app.get('/api/health', (_, res) => res.json({'healthy': true}));


app.post('/api/user', async (req, res) => {
    try {
        if (req.body?.name && req.body?.password && req.body?.email) {
            bcrypt.hash(req.body.password, 10, async (_, hash) => {
                req.body.password = hash;
                await client.connect();
                await client.db('db').collection('users').insertOne(req.body);
                res.status(200).send(`Created user ${JSON.stringify(req.body)}`);
            });
        }
        else {
            res.status(400).send('"name", "password", and "email" are required');
        }
    }
    catch (err) {
        console.error(err);
        res.status(500).send(err);
    }
    finally {
        await client.close();
    }
});


app.post('/api/animal', async (req, res) => {
    try {
        if (req.body?.name && req.body?.user) {
            await client.connect();
            await client.db('db').collection('animals').insertOne(req.body);
            res.status(200).send(`Created animal ${JSON.stringify(req.body)}`);
        }
        else {
            res.status(400).send('"name" and "user" are required');
        }
    }
    catch (err) {
        console.error(err);
        res.status(500).send(err);
    }
    finally {
        await client.close();
    }
});


app.post('/api/training', async (req, res) => {
    try {
        if (req.body?.user && req.body?.animal) {
            await client.connect();
            if (!(await client.db('db').collection('animals').findOne({name: req.body.animal, user: req.body.user}))) {
                res.status(400).send(`Animal ${req.body.animal} owned by ${req.body.user} not found`);
            }
            else {
                await client.db('db').collection('training-logs').insertOne(req.body);
                res.status(200).send(`Created training log ${JSON.stringify(req.body)}`);
            }
        }
        else {
            res.status(400).send('"user" and "animal" are required');
        }
    }
    catch (err) {
        console.error(err);
        res.status(500).send(err);
    }
    finally {
        await client.close();
    }
});


app.get('/api/admin/users', async (_, res) => {
    try {
        await client.connect();
        const users = await client.db('db').collection('users').find({}, { projection: { password: false } }).toArray();
        res.status(200).send(users);
    }
    catch (err) {
        console.error(err);
        res.status(500).send(err);
    }
    finally {
        await client.close();
    }
});


app.get('/api/admin/animals', async (_, res) => {
    try {
        await client.connect();
        const animals = await client.db('db').collection('animals').find({}).toArray();
        res.status(200).send(animals);
    }
    catch (err) {
        console.error(err);
        res.status(500).send(err);
    }
    finally {
        await client.close();
    }
});


app.get('/api/admin/training', async (_, res) => {
    try {
        await client.connect();
        const trainingLogs = await client.db('db').collection('training-logs').find({}).toArray();
        res.status(200).send(trainingLogs);
    }
    catch (err) {
        console.error(err);
        res.status(500).send(err);
    }
    finally {
        await client.close();
    }
});


app.post('/api/user/login', async (req, res) => {
    try {
        if (req.body?.email && req.body?.password) {
            await client.connect();
            const user = await client.db('db').collection('users').findOne({email: req.body.email});
            if (user) {
                bcrypt.compare(req.body.password, user.password, (_, result) => {
                    if (result) {
                        res.status(200).send(`Login successful`);
                    }
                    else {
                        res.status(403).send('Wrong password');
                    }
                });
            }
            else {
                res.status(403).send(`User ${req.body.email} not found`);
            }
        }
        else {
            res.status(403).send('"email" and "password" are required');
        }
    }
    catch (err) {
        console.error(err);
        res.status(500).send(err);
    }
    finally {
        await client.close();
    }
});