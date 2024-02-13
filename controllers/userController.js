// controllers/userController.js

const mysql = require('mysql');

const db = require('../dbConfig'); // Import the db object

exports.registerUser = (req, res) => {
  const { username, password } = req.body;

  // Check if the username already exists
  const checkSql = 'SELECT * FROM users WHERE username = ?';
  db.query(checkSql, [username], (checkErr, checkResults) => {
    if (checkErr) {
      console.error(checkErr);
      res.status(500).json({ error: 'Registration failed' });
    } else if (checkResults.length > 0) {
      // Username already exists
      res.status(409).json({ error: 'Username is already registered' });
    } else {
      // Username is not registered, proceed with registration
      const insertSql = 'INSERT INTO users (username, password) VALUES (?, ?)';
      db.query(insertSql, [username, password], (insertErr, result) => {
        if (insertErr) {
          console.error(insertErr);
          res.status(500).json({ error: 'Registration failed' });
        } else {
          const userId = result.insertId; // Get the generated primary key (id)
          res.status(201).json({ userId, message: 'User registered successfully' });
        }
      });
    }
  });
};