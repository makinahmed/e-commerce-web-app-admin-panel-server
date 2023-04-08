const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { MongoClient } = require("mongodb");
const ObjectID = require('mongodb').ObjectId;
const app = express();
require("dotenv").config();
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
app.use(bodyParser.json());
app.use(cors());
app.use(cookieParser());

const PORT = process.env.PORT || process.env.port_name;
const bcrypt = require("bcryptjs");

const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.PASSWORD}@cluster0.m8c0v.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri);
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.JWT_SECRET, (e, decode) => {
    if (e) {
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.decoded = decode;
    next();
  });
};
async function run() {
  try {
    const db = client.db("interview_admin_panel");
    const usersCollection = db.collection("users");
    const productsCollection = db.collection("products");
    const orderCollection = db.collection("orders");



    // register || login
    app.post("/signup", async (req, res) => {
      const { email, password } = req.body;
      console.log(email, "mob");
      if (!email || !password) {
        res.status(400).send("All fields are mandatory");
      }

      const user = await usersCollection.findOne({ email });
      if (user?.email) {
        res.status(400).send("User Already Exist");
      }
      const hashedPass = await bcrypt.hash(password, 10);
      const result = await usersCollection.insertOne({
        email,
        password: hashedPass,
      });
      const token = jwt.sign({ email }, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });
      res.send({ result, token });
    });

    app.post("/login", async (req, res) => {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).send("All fields are mandatory");
      }
      const user = await usersCollection.findOne({ email });
      if (!user) {
        res.status(400).send("Please sign up first");
      }

      if (user.email && (await bcrypt.compare(password, user?.password))) {
        const token = jwt.sign({ email }, process.env.JWT_SECRET, {
          expiresIn: "1h",
        });
        res.send({ email: user.email, token });
      }
    });

    // products

    app.get("/products", verifyToken, async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded.email;
      if (decodedEmail !== email) {
        return res.status(401).send({ message: "unauthorized access" });
      }

      const cursor = await productsCollection.find({});
      const data = await cursor.toArray();
      res.status(200).send(data);
    });

    app.post("/addproduct", verifyToken, async (req, res) => {
      const email = req.query.email;

      const product = req.body;
      const decodedEmail = req.decoded.email;
      console.log(decodedEmail, "decoded email");
      if (decodedEmail !== email) {
        return res.status(401).send({ message: "unauthorized access" });
      }

      const result = await productsCollection.insertOne(product);
      res.send(result);
    });

    // delete products
    app.delete("/deleteproducts", verifyToken, async (req, res) => {
      const email = req.query.email;

      const products = req.body;
      const decodedEmail = req.decoded.email;

      if (decodedEmail !== email) {
        return res.status(401).send({ message: "unauthorized access" });
      }

      console.log(products.cartProducts);

      for (let product of products?.cartProducts)
      {
        const result = await productsCollection.deleteOne({_id: new ObjectID(product._id)});
      }
       res.status(201).send("deleted");

    });

    // order list


    app.get("/orderlist", verifyToken, async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded.email;
      if (decodedEmail !== email) {
        return res.status(401).send({ message: "unauthorized access" });
      }

      const cursor = await orderCollection.find({});
      const data = await cursor.toArray();
      res.status(200).send(data);
    });

  } finally {
    // await client.close();
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("<h2>HI I am Great!</h2>");
});
app.listen(PORT, () => {
  console.log("App is running on ", PORT);
});
