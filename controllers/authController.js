// controllers/authController.js

const jwt = require('jsonwebtoken');
const mysql = require('mysql');

const db = require('../dbConfig'); // Import the db object

exports.loginUser = (req, res) => {
  const { username, password } = req.body;
  const sql = 'SELECT * FROM users WHERE username = ? AND password = ?';
  const newToken = jwt.sign({ username }, 'your-secret-key');

  db.query(sql, [username, password], (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Login failed' });
    } else if (results.length === 0) {
      res.status(401).json({ error: 'Invalid credentials' });
    } else {
      const userId = results[0].id; // Get the user's primary key (id)
      // Update the user record with a new token
      const updateSql = 'UPDATE users SET token = ? WHERE username = ?';
      db.query(updateSql, [newToken, username], (updateErr, updateResult) => {
        if (updateErr) {
          console.error(updateErr);
          res.status(500).json({ error: 'Login failed' });
        } else {
          res.status(200).json({ userId, token: newToken, message: 'Login successful' });
        }
      });
    }
  });
};
