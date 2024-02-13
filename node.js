const express = require('express');
const mysql = require('mysql');
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken'); // Add this line for JWT
const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());


admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const auth = admin.auth();


const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'mydb',
});


// Connect to MySQL
db.connect((err) => {
  if (err) {
    console.error('Unable to connect to MySQL:', err);
  } else {
    console.log('Connected to MySQL');
    // Create users table if not exists
    db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) UNIQUE,
        password VARCHAR(255),
        token VARCHAR(255)
      );
    `, (err) => {
      if (err) {
        console.error('Error creating users table:', err);
      } else {
        console.log('Users table created or already exists');
      }
    });

    // Create user_products table if not exists
    db.query(`
      CREATE TABLE IF NOT EXISTS user_products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        productName VARCHAR(255),
        productQuantity INT,
        productSTk VARCHAR(255),
        productAmount INT,
        productPrice DECIMAL(10, 2),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `, (err) => {
      if (err) {
        console.error('Error creating user_products table:', err);
      } else {
        console.log('User_products table created or already exists');
      }
    });
  }
});


// Middleware to parse incoming JSON requests
app.use(bodyParser.json());






app.post('/register', (req, res) => {
  const { username, password } = req.body;

  // Check if the phone number (username) already exists
  const checkSql = 'SELECT * FROM users WHERE username = ?';
  db.query(checkSql, [username], (checkErr, checkResults) => {
    if (checkErr) {
      console.error(checkErr);
      res.status(500).json({ error: 'Registration failed' });
    } else if (checkResults.length > 0) {
      // Phone number (username) is already registered
      res.status(409).json({ error: 'Phone number is already registered' });
    } else {
      // Phone number is not registered, proceed with registration
      const insertSql = 'INSERT INTO users (username, password) VALUES (?, ?)';
      const token = jwt.sign({ username }, 'your-secret-key');

      db.query(insertSql, [username, password], (insertErr, result) => {
        if (insertErr) {
          console.error(insertErr);
          res.status(500).json({ error: 'Registration failed' });
        } else {
          res.status(201).json({ token, message: 'User registered successfully' });
        }
      });
    }
  });
});



// User login endpoint
// app.post('/login', (req, res) => {
//   const { username, password } = req.body;
//   const sql = 'SELECT * FROM users WHERE username = ? AND password = ?';
//   db.query(sql, [username, password], (err, results) => {
//     if (err) {
//       console.error(err);
//       res.status(500).json({ error: 'Login failed' });
//     } else if (results.length === 0) {
//       res.status(401).json({ error: 'Invalid credentials' });
//     } else {
//       // Create a JWT token for the user and send it in the response
//       const token = jwt.sign({ username }, 'your-secret-key'); // Replace 'your-secret-key' with a secret key
//       res.status(200).json({ token, message: 'Login successful' });
//     }
//   });
// // });


app.post('/login', (req, res) => {
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
      // Update the user record with a new token
      const updateSql = 'UPDATE users SET token = ? WHERE username = ?';
      db.query(updateSql, [newToken, username], (updateErr, updateResult) => {
        if (updateErr) {
          console.error(updateErr);
          res.status(500).json({ error: 'Login failed' });
        } else {
          res.status(200).json({ token: newToken, message: 'Login successful' });
        }
      });
    }
  });
});


app.get('/users', (req, res) => {
  // Retrieve all users from the database
  const sql = 'SELECT * FROM users';
  db.query(sql, (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to retrieve users' });
    } else {
      const users = results.map(user => ({
        username: user.username,
        // Include other user information if needed
      }));
      res.status(200).json({ users });
    }
  });
});







app.post('/store-product', (req, res) => {
  const { userId, productName, productQuantity, productSTk, productAmount, productPrice } = req.body;

  // Check if the user exists
  const checkUserSql = 'SELECT * FROM users WHERE id = ?';
  db.query(checkUserSql, [userId], (checkUserErr, checkUserResults) => {
    if (checkUserErr) {
      console.error(checkUserErr);
      res.status(500).json({ error: 'Failed to store product ' });
    } else if (checkUserResults.length === 0) {
      res.status(404).json({ error: 'User not found' });
    } else {
      // User exists, store product information
      const insertProductSql = 'INSERT INTO user_products (userid, productName, productQuantity, productSTk, productAmount, productPrice) VALUES (?, ?, ?, ?, ?, ?)';
      db.query(
        insertProductSql,
        [userId, productName, productQuantity, productSTk, productAmount, productPrice],
        (insertErr, insertResult) => {
          if (insertErr) {
            console.error(insertErr);
            res.status(500).json({ error: 'Failed to store product information' });
          } else {
            res.status(201).json({ message: 'Product information stored successfully' });
          }
        }
      );
    }
  });
});


app.get('/get-products/:userId', (req, res) => {
  const userId = req.params.userId;

  // Retrieve all products for the specified user
  const getProductsSql = 'SELECT * FROM user_products WHERE userid = ?';
  db.query(getProductsSql, [userId], (getProductsErr, getProductsResults) => {
    if (getProductsErr) {
      console.error(getProductsErr);
      res.status(500).json({ error: 'Failed to retrieve products' });
    } else {
      const products = getProductsResults; // Assuming multiple rows for products
      res.status(200).json({ products });
    }
  });
});








// app.post('/send-otp', async (req, res) => {
//   const phoneNumber = req.body.phoneNumber;

//   try {
//     const user = await auth.createUser({ phoneNumber });
//     const userRecord = await auth.getUser(user.uid);

//     // Send OTP to the provided phone number
//     // Firebase automatically sends the OTP code
//     console.log(`OTP sent to ${phoneNumber}`);
    
//     res.status(200).json({ message: 'OTP sent successfully' });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: 'Failed to send OTP' });
//   }
// });

// // Verify OTP
// app.post('/verify-otp', async (req, res) => {
//   const phoneNumber = req.body.phoneNumber;
//   const otp = req.body.otp;

//   try {
//     const verificationResult = await auth.checkPhoneNumber(otp, phoneNumber);
    
//     if (verificationResult === true) {
//       res.status(200).json({ message: 'OTP verified successfully' });
//     } else {
//       res.status(401).json({ error: 'Incorrect OTP' });
//     }
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: 'Failed to verify OTP' });
//   }
// });

// Send OTP
// app.post('/send-otp', async (req, res) => {
//   const phoneNumber = req.body.phoneNumber;

//   try {
//     const user = await auth.createUser({
//       phoneNumber: phoneNumber,
//     });

//     // You can optionally send an OTP to the user manually at this point if needed

//     res.status(200).json({ message: 'User created successfully' });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: 'Failed to create user or send OTP' });
//   }
// });


// Verify OTP
// app.post('/verify-otp', async (req, res) => {
//   const verificationId = req.body.verificationId;
//   const otp = req.body.otp;

//   try {
//     const credential = await auth.signInWithPhoneNumber(verificationId, otp);

//     // Successfully verified OTP
//     res.status(200).json({ message: 'OTP verified successfully', token: credential.user.getIdToken() });
//   } catch (error) {
//     console.error(error);
//     res.status(401).json({ error: 'Incorrect OTP' });
//   }
// });




// User registration endpoint
// app.post('/register', (req, res) => {
//   const { username, password } = req.body;
//   const sql = 'INSERT INTO users (username, password) VALUES (?, ?)';
//   db.query(sql, [username, password], (err, result) => {
//     if (err) {
//       console.error(err);
//       res.status(500).json({ error: 'Registration failed' });
//     } else {
//       // Create a JWT token for the user and send it in the response
//       const token = jwt.sign({ username }, 'your-secret-key'); // Replace 'your-secret-key' with a secret key
//       res.status(201).json({ token, message: 'User registered successfully' });
//     }
//   });
// });











// app.post('/addnewcustomer', (req, res) => {
//   const { userId,customerId, customerName, phoneNumber, address, creditAmount} = req.body;

//   // Check if the user exists
//   const checkUserSql = 'SELECT * FROM users WHERE id = ?';
//   db.query(checkUserSql, [userId], (checkUserErr, checkUserResults) => {
//     if (checkUserErr) {
//       console.error(checkUserErr);
//       res.status(500).json({ error: 'Failed to store product ' });
//     } else if (checkUserResults.length === 0) {
//       res.status(404).json({ error: 'User not found' });
//     } else {
//       // User exists, store product information
//       const insertProductSql = 'INSERT INTO customer_info (userid, customerId, customerName, phoneNumber, address, creditAmount) VALUES (?, ?, ?, ?, ?, ?)';
//       db.query(
//         insertProductSql,
//         [userId, customerName, phoneNumber, address, creditAmount],
//         (insertErr, insertResult) => {
//           if (insertErr) {
//             console.error(insertErr);
//             res.status(500).json({ error: 'Failed to store product information' });
//           } else {
//             res.status(201).json({ message: 'Product information stored successfully' });
//           }
//         }
//       );
//     }
//   });
// });



















// app.post('/create-entry', (req, res) => {
//   const { title, name, category, details } = req.body;

//   // Assuming details is an array of objects with price, tag, amount properties
//   const subItemsValues = details.map((item) => {
//     return `('${title}', '${name}', '${category}', '${item.price}', '${item.tag}', '${item.amount}')`;
//   }).join(',');

//   const query = `
//     INSERT INTO createentry (title, name, category, price, tag, amount)
//     VALUES ${subItemsValues};
//   `;

//   db.query(query, (err, result) => {
//     if (err) {
//       console.error('Error executing MySQL query:', err);
//       res.status(500).send('Internal Server Error');
//     } else {
//       console.log('Entry successfully created');
//       res.status(200).send('Entry created successfully');
//     }
//   });
// });


// app.get('/get-entries', (req, res) => {
//   const query = `
//     SELECT * FROM createentry;
//   `;

//   db.query(query, (err, result) => {
//     if (err) {
//       console.error('Error executing MySQL query:', err);
//       res.status(500).send('Internal Server Error');
//     } else {
//       // Modify the response structure before sending
//       const modifiedEntries = result.map((entry) => {
//         return {
//           id: entry.id,
//           title: entry.title,
//           name: entry.name,
//           category: entry.category,
//           details: {
//             price: entry.price,
//             tag: entry.tag,
//             amount: entry.amount,
//           },
//         };
//       });

//       res.status(200).json(modifiedEntries);
//     }
//   });
// });






// app.listen(port, () => {
//   console.log(`Server is running on port ${port}`);
// });



// // POST request handler
// app.post('/create-entry', (req, res) => {
//   const { title, name, category, subItems } = req.body;

//   // Assuming subItems is an array of objects with price, tag, amount properties
//   const subItemsValues = subItems.map((item) => {
//     return `('${item.price}', '${item.tag}', '${item.amount}')`;
//   }).join(',');

//   const query = `
//     INSERT INTO your_table_name (title, name, category, price, tag, amount)
//     VALUES ('${title}', '${name}', '${category}', ${subItemsValues});
//   `;

//   db.query(query, (err, result) => {
//     if (err) {
//       console.error('Error executing MySQL query:', err);
//       res.status(500).send('Internal Server Error');
//     } else {
//       console.log('Entry successfully created');
//       res.status(200).send('Entry created successfully');
//     }
//   });
// });




// app.post('/images', (req, res) => {
//   const images = req.body;

//   // Insert each image into MySQL database
//   const insertQuery = 'INSERT INTO images (image_url, text_items, details) VALUES (?, ?, ?)';
//   const insertPromises = images.map(image => {
//     return new Promise((resolve, reject) => {
//       db.query(insertQuery, [image.imageUrl, JSON.stringify(image.textItems), JSON.stringify(image.details)], (err, results) => {
//         if (err) {
//           console.error('Error inserting data into MySQL:', err);
//           reject(err);
//         } else {
//           resolve(results.insertId);
//         }
//       });
//     });
//   });

//   Promise.all(insertPromises)
//     .then(imageIds => {
//       res.status(201).json({ message: 'Images added successfully', imageIds });
//     })
//     .catch(error => {
//       res.status(500).send('Internal Server Error');
//     });
// });

// // GET request to retrieve all images
// app.get('/images', (req, res) => {
//   // Retrieve all images from MySQL database
//   const selectQuery = 'SELECT * FROM images';
//   db.query(selectQuery, (err, results) => {
//     if (err) {
//       console.error('Error retrieving data from MySQL:', err);
//       res.status(500).send('Internal Server Error');
//     } else {
//       res.status(200).json(results);
//     }
//   });
// });





























// app.post('/mysql-notifications', (req, res) => {
//   const { message } = req.body;

//   // Add logic to process the incoming MySQL notification as needed

//   // Send the notification to FCM
//   const registrationToken = 'your_device_fcm_token';
//   const payload = {
//     notification: {
//       title: 'MySQL Notification',
//       body: message,
//     },
//   };

//   admin.messaging().sendToDevice(registrationToken, payload)
//     .then((response) => {
//       console.log('Notification sent successfully:', response);
//       res.status(200).json({ message: 'Notification sent successfully' });
//     })
//     .catch((error) => {
//       console.error('Error sending notification:', error);
//       res.status(500).json({ error: 'Failed to send notification' });
//     });
// });
