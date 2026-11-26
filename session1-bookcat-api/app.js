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

app.get("/books", async (req, res) => {
  let connection;
  try {
    connection = await sql.connect(dbConfig);
    const result = await connection
      .request()
      .query("SELECT ISBN, Title, YearPublish, PublisherID, BookCat FROM Book");
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  } finally {
    if (connection) await connection.close();
  }
});

app.get("/books/:isbn", async (req, res) => {
  let connection;
  try {
    connection = await sql.connect(dbConfig);
    const result = await connection
      .request()
      .input("isbn", sql.Char(10), req.params.isbn)
      .query(
        "SELECT ISBN, Title, YearPublish, PublisherID, BookCat FROM Book WHERE ISBN = @isbn",
      );

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Book not found" });
    }
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  } finally {
    if (connection) await connection.close();
  }
});

app.post("/books", async (req, res) => {
  const { isbn, title, yearPublish, publisherId, bookCat } = req.body;

  if (!isbn || !title || !yearPublish || !publisherId || !bookCat) {
    return res.status(400).json({
      error: "isbn, title, yearPublish, publisherId and bookCat are required",
    });
  }

  let connection;
  try {
    connection = await sql.connect(dbConfig);
    const result = await connection
      .request()
      .input("isbn", sql.Char(10), isbn)
      .input("title", sql.VarChar(200), title)
      .input("yearPublish", sql.Char(4), yearPublish)
      .input("publisherId", sql.SmallInt, publisherId)
      .input("bookCat", sql.Char(2), bookCat)
      .query(
        `INSERT INTO Book (ISBN, Title, YearPublish, PublisherID, BookCat)
         OUTPUT INSERTED.*
         VALUES (@isbn, @title, @yearPublish, @publisherId, @bookCat)`,
      );

    res.status(201).json(result.recordset[0]);
  } catch (err) {
    if (err.number === 2627) {
      return res.status(409).json({ error: "ISBN already exists" });
    }
    res.status(500).json({ error: "Database error" });
  } finally {
    if (connection) await connection.close();
  }
});

app.put("/books/:isbn", async (req, res) => {
  const { title, yearPublish } = req.body;

  if (!title || !yearPublish) {
    return res
      .status(400)
      .json({ error: "title and yearPublish are required" });
  }

  let connection;
  try {
    connection = await sql.connect(dbConfig);
    const result = await connection
      .request()
      .input("isbn", sql.Char(10), req.params.isbn)
      .input("title", sql.VarChar(200), title)
      .input("yearPublish", sql.Char(4), yearPublish)
      .query(
        "UPDATE Book SET Title = @title, YearPublish = @yearPublish WHERE ISBN = @isbn",
      );

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Book not found" });
    }
    res.json({ isbn: req.params.isbn, title, yearPublish });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  } finally {
    if (connection) await connection.close();
  }
});

app.post("/books-with-author", async (req, res) => {
  const { isbn, title, yearPublish, publisherId, bookCat, authorId } = req.body;

  if (
    !isbn ||
    !title ||
    !yearPublish ||
    !publisherId ||
    !bookCat ||
    !authorId
  ) {
    return res
      .status(400)
      .json({ error: "All fields including authorId are required" });
  }

  let connection;
  let transaction;
  try {
    connection = await sql.connect(dbConfig);
    transaction = new sql.Transaction(connection);
    await transaction.begin();

    await transaction
      .request()
      .input("isbn", sql.Char(10), isbn)
      .input("title", sql.VarChar(200), title)
      .input("yearPublish", sql.Char(4), yearPublish)
      .input("publisherId", sql.SmallInt, publisherId)
      .input("bookCat", sql.Char(2), bookCat)
      .query(
        `INSERT INTO Book (ISBN, Title, YearPublish, PublisherID, BookCat)
         VALUES (@isbn, @title, @yearPublish, @publisherId, @bookCat)`,
      );

    await transaction
      .request()
      .input("isbn", sql.Char(10), isbn)
      .input("authorId", sql.SmallInt, authorId)
      .query(
        "INSERT INTO BookAuthor (ISBN, AuthorID) VALUES (@isbn, @authorId)",
      );

    await transaction.commit();
    res.status(201).json({ isbn, title, authorId });
  } catch (err) {
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (e) {}
    }
    if (err.number === 2627) {
      return res.status(409).json({ error: "ISBN already exists" });
    }
    res.status(500).json({ error: "Database error" });
  } finally {
    if (connection) await connection.close();
  }
});

app.get("/books/:isbn/copies/:copyNo", async (req, res) => {
  let connection;
  try {
    connection = await sql.connect(dbConfig);
    const result = await connection
      .request()
      .input("isbn", sql.Char(10), req.params.isbn)
      .input("copyNo", sql.TinyInt, req.params.copyNo)
      .query("SELECT * FROM BookCopy WHERE ISBN = @isbn AND CopyNo = @copyNo");

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Copy not found" });
    }
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  } finally {
    if (connection) await connection.close();
  }
});

app.put("/books/:isbn/copies/:copyNo", async (req, res) => {
  const { rentalRate, status } = req.body;

  if (rentalRate === undefined || !status) {
    return res
      .status(400)
      .json({ error: "rentalRate and status are required" });
  }

  let connection;
  try {
    connection = await sql.connect(dbConfig);
    const result = await connection
      .request()
      .input("isbn", sql.Char(10), req.params.isbn)
      .input("copyNo", sql.TinyInt, req.params.copyNo)
      .input("rentalRate", sql.SmallMoney, rentalRate)
      .input("status", sql.Char(1), status)
      .query(
        `UPDATE BookCopy SET RentalRate = @rentalRate, Status = @status
         WHERE ISBN = @isbn AND CopyNo = @copyNo`,
      );

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Copy not found" });
    }
    res.json({
      isbn: req.params.isbn,
      copyNo: req.params.copyNo,
      rentalRate,
      status,
    });
  } catch (err) {
    if (err.number === 547) {
      return res
        .status(400)
        .json({ error: "Rental rate must be at least 2.50" });
    }
    res.status(500).json({ error: "Database error" });
  } finally {
    if (connection) await connection.close();
  }
});

app.get("/authors/:authorId/books", async (req, res) => {
  let connection;
  try {
    connection = await sql.connect(dbConfig);
    const result = await connection
      .request()
      .input("authorId", sql.SmallInt, req.params.authorId)
      .query(
        `SELECT b.ISBN, b.Title
         FROM BookAuthor ba
         JOIN Book b ON ba.ISBN = b.ISBN
         WHERE ba.AuthorID = @authorId`,
      );

    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  } finally {
    if (connection) await connection.close();
  }
});

app.listen(3000, () => {
  console.log("Listening on port 3000");
});
