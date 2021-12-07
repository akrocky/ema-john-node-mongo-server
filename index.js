const express = require('express');
const { MongoClient } = require('mongodb');
require('dotenv').config();
const cors = require('cors');

const res = require('express/lib/response');
const admin = require("firebase-admin");
const app = express();
const port = process.env.PORT || 7000;


//firebase admin initialization

var serviceAccount = require("./ema-john-simple-42a9f-firebase-adminsdk-df3z5-13b483e400.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
//middleware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.26wwn.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
async function verifyToken(req, res, next) {
    if (req.headers?.authorization.startsWith('Bearer ')) {
        const idToken = req.headers.authorization.split('Bearer ')[1];
        try {
            const decodedUser = await admin.auth().verifyIdToken(idToken);
            req.decodedUserEmail = decodedUser.email;
        }
        catch {

        }
    };
    next();
}
async function run() {
    try {
        await client.connect();
        const database = client.db('online_Shop');
        const productCollection = database.collection('products');
        const orderCollection = database.collection('orders');
        //get products Api
        app.get('/products', async (req, res) => {

            const cursor = productCollection.find({});
            const page = req.query.page;
            const size = parseInt(req.query.size);
            let products;
            const count = await cursor.count();
            if (page) {
                products = await cursor.skip(page * size).limit(size).toArray();
            }
            else {
                products = await cursor.toArray();
            }


            res.send({
                count,
                products
            });
        });
        //use post to get data by keys
        app.post('/products/bykeys', async (req, res) => {
            const keys = req.body;
            const query = { key: { $in: keys } };
            const products = await productCollection.find(query).toArray();

            res.json(products)
        })
        //add order api
        app.get('/orders', verifyToken, async (req, res) => {
            const email = req.query.email;
            if (req.decodedUserEmail === email) {
                query = { email: email }

                const cursor = orderCollection.find(query);
                const orders = await cursor.toArray();
                res.json(orders);
            }
            else {
                res.status(401).json({ meassage: 'user not authorized' })
            }



        })
        app.post('/orders', async (req, res) => {

            const order = req.body;
            order.createdAt = new Date();
            const result = await orderCollection.insertOne(order)
            res.send(result)

        })
        //end try
    }
    finally {
        //await client.close()
    }
}
run().catch(console.dir)
app.get('/', (req, res) => {
    res.send('emajohn server is running')
});
app.listen(port, () => {
    console.log('server is running', port);
})