const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();

//middle wares
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 5000;

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.wdkgpff.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  // console.log("token", authHeader);
  if (!authHeader) {
    return res
      .status(401)
      .send({ message: "unauthorized access", status: 401 });
  }
  const token = authHeader.split(" ")[1];
  console.log(token);
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      console.log("error", err);
      return res
        .status(403)
        .send({ message: "unauthorized access", status: 403 });
    }
    req.decoded = decoded;
    // console.log(decoded);
    next();
  });
}

async function run() {
  try {
    const serviceCollection = client
      .db("speedy-service")
      .collection("services");
    const reviewCollection = client.db("speedy-service").collection("reviews");

    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    app.post("/services", async (req, res) => {
      const service = req.body;
      const result = await serviceCollection.insertOne(service);
      res.send(result);
    });

    app.get("/services", async (req, res) => {
      const query = {};
      const cursor = serviceCollection.find(query);
      const services = await cursor.toArray();
      res.send(services);
    });

    app.get("/services-limited", async (req, res) => {
      const query = {};
      const cursor = serviceCollection.find(query);
      const limitedService = await cursor.skip(0).limit(3).toArray();
      res.send(limitedService);
    });

    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      // console.log(id);
      const query = { _id: ObjectId(id) };
      const service = await serviceCollection.findOne(query);
      res.send(service);
    });

    app.post("/reviews", async (req, res) => {
      const review = req.body;
      const result = await reviewCollection.insertOne(review);
      res.send(result);
    });

    app.get("/reviews", verifyJWT, async (req, res) => {
      const decoded = req.decoded;
      if (decoded.email !== req.query.email) {
        return res.status(403).send({ message: "unauthorized access" });
      }
      let query = {};
      if (req.query.email) {
        query = {
          email: req.query.email,
        };
      }
      const cursor = reviewCollection.find(query);
      const result = await cursor.toArray();
      // console.log(result);
      res.send(result);
    });

    app.get("/reviewsByPost/:id", async (req, res) => {
      const id = req.params.id;
      const query = { id: id };
      const cursor = reviewCollection.find(query);
      const reviews = await cursor.toArray();
      res.send(reviews);
    });

    app.patch("/reviews/:id", async (req, res) => {
      const id = req.params.id;
      const text = req.body.text;

      console.log("updated", id, text);
      const query = { _id: ObjectId(id) };
      const updateDoc = {
        $set: {
          text: text,
        },
      };
      const result = await reviewCollection.updateOne(query, updateDoc);
      console.log(result);
      res.send(result);
    });

    app.delete("/reviews/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await reviewCollection.deleteOne(query);
      res.send(result);
    });
  } finally {
  }
}

run().catch((err) => console.error(err));

app.get("/", (req, res) => {
  res.send("server is running");
});

app.listen(port, (req, res) => {
  console.log(`server is running on ${port}`);
});
