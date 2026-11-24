require("dotenv").config();

const express = require("express");
const sql = require("mssql");
const app = express();

app.use(express.json());

const dbConfig = {
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: 1433,
  options: { trustServerCertificate: true },
};

app.get("/", (req, res) => {
  res.send("Welcome to the Book Category API");
});

app.get("/categories", (req, res) => {
  res.json([
    { id: 1, name: "Fiction" },
    { id: 2, name: "Non-Fiction" },
    { id: 3, name: "Biography" },
  ]);
});

app.get("/about", (req, res) => {
  res.send("Hi, I'm Zavier and I love coding.");
});

app.get("/db-test", async (req, res) => {
  let connection;
  try {
    connection = await sql.connect(dbConfig);
    const result = await connection
      .request()
      .query("SELECT COUNT(*) AS Total FROM Author");
    res.json({ connected: true, authors: result.recordset[0].Total });
  } catch (err) {
    res.status(500).json({ connected: false, error: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

app.get("/publishers", async (req, res) => {
  let connection;
  try {
    connection = await sql.connect(dbConfig);
    const result = await connection
      .request()
      .query("SELECT PublisherID, Name FROM Publisher");
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

app.get("/publishers/:id", async (req, res) => {
  let connection;
  try {
    connection = await sql.connect(dbConfig);
    const result = await connection
      .request()
      .input("id", sql.SmallInt, req.params.id)
      .query("SELECT PublisherID, Name FROM Publisher WHERE PublisherID = @id");

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Publisher not found" });
    }
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

app.post("/publishers", async (req, res) => {
  const { publisherId, name } = req.body;

  if (!publisherId || !name) {
    return res.status(400).json({ error: "publisherId and name are required" });
  }

  let connection;
  try {
    connection = await sql.connect(dbConfig);
    await connection
      .request()
      .input("publisherId", sql.SmallInt, publisherId)
      .input("name", sql.VarChar(50), name)
      .query(
        "INSERT INTO Publisher (PublisherID, Name) VALUES (@publisherId, @name)",
      );

    res.status(201).json({ publisherId, name });
  } catch (err) {
    if (err.number === 2627) {
      return res.status(409).json({ error: "Publisher ID already exists" });
    }
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

app.listen(3000, () => {
  console.log("Listening on port 3000");
});
