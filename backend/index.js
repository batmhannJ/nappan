const port = 4000;
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const path = require("path");
const cors = require("cors");
const multer = require("multer");

const nodemailer = require("nodemailer");
const otpGenerator = require("otp-generator");

// import routes
const adminRoutes = require("./routes/adminRoute");
const orderRouter = require("./routes/orderRoute");
const sellerRouter = require("./routes/sellerRoute");
const userRoutes = require("./routes/userRoute");
const transactionRoutes = require("./routes/transactionRoute");
const productRoute = require("./routes/productRoute");
const cartRoute = require("./routes/cartRoute");
const { signup } = require("./controllers/sellerController");
const { getUsers } = require("./controllers/userController");
const { ObjectId } = require('mongodb');

require("dotenv").config();

const mongoURI = process.env.MONGODB_URI;

// Define the sendEmail function
const sendEmail = async (to, subject, text) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    text,
  };

  return new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Error sending email:", error);
        reject(error);
      } else {
        console.log("Email sent:", info.response);
        resolve(info.response);
      }
    });
  });
};
const allowedOrigins = [  
  'http://localhost:3000', 
  'http://localhost:28429',
  'http://localhost:5173', 
  'http://localhost:5174', 
  'https://tienda-han.onrender.com',
];
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl requests)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true // Allow credentials to be included in the request
}));
app.use(express.json());
app.use("/api/transactions", transactionRoutes);
app.use("/api", productRoute);
app.use("/api/cart", cartRoute);

// Database Connection
mongoose
  .connect(mongoURI)
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => console.error("MongoDB connection error:", err));

// API Creation
app.get("/", (req, res) => {
  res.send("Express App is Running");
});

app.get("/api/transactions", (req, res) => {
  res.json({ message: "This is the transactions endpoint" });
});
app.get('/api/users/search', getUsers); // Define the route that uses getUsers


app.listen(port, (error) => {
  if (!error) {
    console.log("Server Running on Port: " + port);
  } else {
    console.log("Error: " + error);
  }
});

// Image Storage Engine
const storage = multer.diskStorage({
  destination: "./upload/images",
  filename: (req, file, cb) => {
    return cb(
      null,
      `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`
    );
  },
});

const upload = multer({ storage: storage });

// Creating Upload Endpoints for Images
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); // Allow all origins
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS'); // Allow specified methods
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization'); // Allow specified headers
  next();
});
app.use("/images", express.static("upload/images"));
app.use('/upload', express.static('upload'));
app.use('/upload/images', express.static('upload/images'));



app.post("/upload", upload.single("product"), (req, res) => {
  res.json({
    success: 1,
    image_url: req.file.filename,
  });
});

app.post("/api/signup", upload.single("idPicture"), signup);

const CartItems = require("./models/orderedItemsModel");

// Schema for Creating Products
const Product = require("./models/productModels");

// Creating Middleware to fetch user
const fetchUser = require("./middleware/auth");

// Schema Creation for User Model
const Users = require("./models/userModels");
const Seller = require("./models/sellerModels");
const Cart = require('./models/cartModel'); 

// Schema Creation for Transaction Model
const Transaction = require("./models/transactionModel");

// Creating PlaceOrder Endpoint
app.use("/api/order", orderRouter);

// Seller Login Sign Up Endpoint
app.use("/api/seller", sellerRouter);

// Fetch all users
app.get("/users", async (req, res) => {
  try {
    const users = await Users.find({});
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

//app.post("/api/ordered-items", orderedItemsRouter);
//app.get("/getPaidItems", orderedItemsRouter);
/*app.get("/getOrderedItemsById/:id", async (req, res) => {
  try {
    const orders = await Order.find({});
    res.json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});*/
//change password api
app.post("/updatepassword/:id", async (req, res) => {
  const { id } = req.params;
  const { password: password } = req.body;

  const user = await Users.findByIdAndUpdate(id, password);
  console.log(id);
  console.log(password);
  user.password = password;
  await user.save();
});

app.get("/fetchuser/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const user = await Users.findById(id);
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/addproduct", async (req, res) => {
  let products = await Product.find({});
  let id;
  if (products.length > 0) {
    let last_product_array = products.slice(-1);
    let last_product = last_product_array[0];
    id = last_product.id + 1;
  } else {
    id = 1;
  }
  const product = new Product({
    id: id,
    name: req.body.name,
    image: req.body.image,
    category: req.body.category,
    new_price: req.body.new_price,
    old_price: req.body.old_price,
    s_stock: req.body.s_stock,
    m_stock: req.body.m_stock,
    l_stock: req.body.l_stock,
    xl_stock: req.body.xl_stock,
    stock: req.body.stock,
    description: req.body.description,
    tags: req.body.tags,
  });
  await product.save();
  console.log(product);
  res.json({
    success: true,
    name: req.body.name,
  });
  const {
    name,
    image,
    category,
    new_price,
    old_price,
    s_stock,
    m_stock,
    l_stock,
    xl_stock,
    stock,
    description,
    tags,
  } = req.body;

  // Log received product data
  console.log("Received Product Data:", {
    name,
    image,
    category,
    new_price,
    old_price,
    s_stock,
    m_stock,
    l_stock,
    xl_stock,
    stock,
    description,
    tags,
  });
});

// Creating API for deleting Products
app.post("/removeproduct", async (req, res) => {
  await Product.findOneAndDelete({ id: req.body.id });
  console.log("Removed");
  res.json({
    success: true,
    name: req.body.name,
  });
});

// Creating API for getting All Products
app.get("/allproducts", async (req, res) => {
  let products = await Product.find({});
  console.log("All Products Fetched");
  res.send(products);
});

// Creating Endpoint for Registering the user
app.post("/signup", async (req, res) => {
  let check = await Users.findOne({ email: req.body.email });
  if (check) {
    return res
      .status(400)
      .json({ success: false, errors: "Existing User Found" });
  }

  let cart = {};
  for (let i = 0; i < 300; i++) {
    cart[i] = 0;
  }

  const user = new Users({
    name: req.body.username,
    email: req.body.email,
    phone: req.body.phone,
    password: req.body.password,
    cartData: cart,
  });

  // Debugging log
  console.log("User data before saving:", user);

  try {
    await user.save();
  } catch (error) {
    console.error("Error saving user:", error);
    return res
      .status(500)
      .json({ success: false, errors: "Error saving user." });
  }

  const data = { user: { id: user.id } };
  const token = jwt.sign(data, "secret_ecom");
  res.json({ success: true, token });
});

// Creating Endpoint for User Login
app.post("/login", async (req, res) => {
  let user = await Users.findOne({ email: req.body.email });
  if (user) {
    const passCompare = req.body.password === user.password;
    if (passCompare) {
      const data = {
        user: {
          id: user.id,
        },
      };
      const token = jwt.sign(data, "secret_ecom");
      // Ibalik ang user ID kasama ang token
      res.json({ success: true, token, userId: user._id }); // Idagdag ang user ID dito
    } else {
      res.json({ success: false, errors: "Error: Wrong Password" });
    }
  } else {
    res.json({ success: false, errors: "Error: Wrong Email Address" });
  }
});

// Creating Endpoint for NewCollection Data
app.get("/newcollections", async (req, res) => {
  try {
    let products = await Product.find({});
    let newcollection = products.slice(1).slice(-8); // Get the last 8 products after the first one

    // Map through the products to construct the full image URL
    const updatedProducts = newcollection.map(product => {
      // Determine which image to display: edited or main
      const mainImage = product.image ? `http://localhost:4000/images/${product.image}` : null;
      const editedImage = product.editedImage ? `http://localhost:4000/images/${product.editedImage}` : null; // Assuming editedImage is stored in the product object

      // Choose the edited image if it exists; otherwise, use the main image
      const imageToDisplay = editedImage || mainImage;

      return {
        ...product.toObject(), // Convert Mongoose object to plain JavaScript object
        image: imageToDisplay // Set the selected image
      };
    });

    console.log("New Collection Fetched");
    res.send(updatedProducts);
  } catch (error) {
    console.error("Error fetching new collections:", error);
    res.status(500).send({ error: "Internal Server Error" });
  }
});


// Creating Endpoint for Popular in Crafts Section
app.get("/popularincrafts", async (req, res) => {
  try {
    let products = await Product.find({ category: "crafts" });
    let popular_in_crafts = products.slice(5, 9);

    // Map through the products to construct the full image URL
    const updatedProducts = popular_in_crafts.map(product => {
      // Determine which image to display: edited or main
      const mainImage = product.image ? `http://localhost:4000/images/${product.image}` : null;
      const editedImage = product.editedImage ? `http://localhost:4000/images/${product.editedImage}` : null; // Assuming editedImage is stored in the product object

      // Choose the edited image if it exists; otherwise, use the main image
      const imageToDisplay = editedImage || mainImage;

      return {
        ...product.toObject(), // Convert Mongoose object to plain JavaScript object
        image: imageToDisplay // Set the selected image
      };
    });

    console.log("Popular in Crafts Fetched");
    res.send(updatedProducts);
  } catch (error) {
    console.error("Error fetching popular products in crafts:", error);
    res.status(500).send({ error: "Internal Server Error" });
  }
});

// Creating Endpoint for adding products in CartData
app.post("/addtocart", fetchUser, async (req, res) => {
  console.log("added", req.body.itemId);
  let userData = await Users.findOne({ _id: req.user.id });
  userData.cartData[req.body.itemId] += 1;
  await Users.findOneAndUpdate(
    { _id: req.user.id },
    { cartData: userData.cartData }
  );
  res.send("Added");
});

// API endpoint to update item quantity
/*app.put('/items/:id', async (req, res) => {
  const { id } = req.params;
  const { quantity } = req.body;

  try {
    const updatedItem = await Cart.findOneAndUpdate(
      { id: id }, // find item by id
      { quantity: quantity }, // update quantity
      { new: true } // return the updated document
    );

    if (!updatedItem) {
      return res.status(404).json({ message: 'Item not found' });
    }

    res.json(updatedItem);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating item quantity' });
  }
})*/

// Creating Endpoint to remove product from CartData
app.post("/removefromcart", fetchUser, async (req, res) => {
  console.log("removed", req.body.itemId);
  let userData = await Users.findOne({ _id: req.user.id });
  if (userData.cartData[req.body.itemId] > 0)
    userData.cartData[req.body.itemId] -= 1;
  await Users.findOneAndUpdate(
    { _id: req.user.id },
    { cartData: userData.cartData }
  );
  res.send("Removed");
});

// Create Endpoint to get CartData
app.post("/getcart", fetchUser, async (req, res) => {
  console.log("GetCart");
  let userData = await Users.findOne({ _id: req.user.id });
  res.json(userData.cartData);
});

// Corrected endpoint to fetch related products based on category
app.get("/relatedproducts/:category", async (req, res) => {
  const category = req.params.category;
  try {
    const relatedProducts = await Product.find({ category });

    // Map through the related products to construct the full image URL
    const updatedRelatedProducts = relatedProducts.map(product => {
      // Determine which image to display: edited or main
      const mainImage = product.image ? `http://localhost:4000/images/${product.image}` : null;
      const editedImage = product.editedImage ? `http://localhost:4000/images/${product.editedImage}` : null; // Assuming editedImage is stored in the product object

      // Choose the edited image if it exists; otherwise, use the main image
      const imageToDisplay = editedImage || mainImage;

      return {
        ...product.toObject(), // Convert Mongoose object to plain JavaScript object
        image: imageToDisplay // Set the selected image
      };
    });

    console.log("Related Products Fetched");
    res.json(updatedRelatedProducts);
  } catch (error) {
    console.error("Error fetching related products:", error);
    res.status(500).json({ error: "Failed to fetch related products" });
  }
});


let otpStore = {};

// Set up nodemailer transporter
const transporter = nodemailer.createTransport({
  service: "gmail", // Use your email service provider (like Gmail)
  auth: {
    user: process.env.EMAIL_USER, // Your email
    pass: process.env.EMAIL_PASSWORD, // Your email password
  },
  tls: {
    rejectUnauthorized: false, // Disable SSL certificate validation
  },
});

app.post("/send-otp", async (req, res) => {
  const { email } = req.body;
  console.log("Request Body:", req.body);
  // Check if the email is already used
  let check = await Users.findOne({ email });
  if (check) {
    return res
      .status(400)
      .json({ success: false, errors: "Existing User Found" });
  }

  // Generate OTP
  const otp = otpGenerator.generate(6, {
    upperCaseAlphabets: false,
    specialChars: false,
  });
  otpStore[email] = otp;

  // Send OTP via email
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Your OTP Code",
    text: `Your OTP code is ${otp}`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("Error sending OTP:", error);
      return res
        .status(500)
        .json({ success: false, errors: "Failed to send OTP" });
    }
    console.log("OTP sent:", info.response);
    res.json({ success: true, message: "OTP sent to your email" });
  });
});

// Endpoint to verify OTP and sign up user
app.post("/verify-otp", async (req, res) => {
  const { email, otp, username, phone, password } = req.body;

  // Check if the OTP is valid
  if (otpStore[email] !== otp) {
    return res.status(400).json({ success: false, errors: "Invalid OTP" });
  }

  // Clear OTP after successful verification
  delete otpStore[email];

  // Create user after OTP is verified
  let cart = {};
  for (let i = 0; i < 300; i++) {
    cart[i] = 0;
  }
  const user = new Users({
    name: username,
    email,
    password,
    phone,
    cartData: cart,
  });

  await user.save();

  const data = {
    user: {
      id: user.id,
    },
  };

  const token = jwt.sign(data, "secret_ecom");
  res.json({ success: true, token });
});

// Function to generate a 6-digit OTP

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString(); // Generates a number between 100000 and 999999
};
// In your Express.js backend
app.post("/forgot-password", async (req, res) => {
  console.log("Forgot Password route hit");
  const { email } = req.body;

  // Check if email exists in your database
  try {
    // Check if email exists in your database
    const user = await Users.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, errors: "User not found." });
    }

    // Generate OTP
    const otp = generateOTP(); // Function to generate OTP
    user.otp = otp; // Save OTP to user record
    await user.save();

    // Send OTP to the user's email
    await sendEmail(user.email, `Your OTP: ${otp}`);

    return res
      .status(200)
      .json({ success: true, message: "OTP sent successfully." });
  } catch (error) {
    console.error("Error processing forgot password request:", error);
    res.status(500).json({ success: false, errors: "Internal server error." });
  }
});

app.post("/verify-otp", async (req, res) => {
  const { email, otp, newPassword } = req.body;

  // Check if the OTP is valid
  if (otpStore[email] !== otp) {
    return res.status(400).json({ success: false, errors: "Invalid OTP" });
  }

  // Clear OTP after successful verification
  delete otpStore[email];

  // Update user password
  try {
    const user = await Users.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, errors: "User not found" });
    }
    user.password = newPassword; // Consider hashing the password before saving
    await user.save();
    res.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    console.error("Error updating password:", error);
    res
      .status(500)
      .json({ success: false, errors: "Failed to update password" });
  }
});

app.post("/reset-password", async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return res
      .status(400)
      .json({ success: false, errors: "Please provide all required fields." });
  }

  try {
    // Find user by email
    const user = await Users.findOne({ email });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, errors: "User not found." });
    }

    // Verify OTP (You should implement your own OTP verification logic here)
    if (user.otp !== otp) {
      return res.status(400).json({ success: false, errors: "Invalid OTP." });
    }

    // Update the user's password directly (plain text)
    user.password = newPassword;
    user.otp = null; // Clear OTP after successful reset
    await user.save();

    // Respond with success
    res.json({ success: true, message: "Password successfully reset." });
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({ success: false, errors: "Server error." });
  }
});

app.get("/transactions/totalAmount", async (req, res) => {
  try {
    const transactions = await Transaction.find({}); // Fetch all transactions

    if (!transactions.length) {
      return res.json(0); // Return 0 if no transactions
    }

    // Calculate the total amount
    const totalAmount = transactions.reduce((total, Transaction) => {
      return total + Transaction.amount; // Assuming 'amount' is a number
    }, 0);

    res.json(totalAmount); // Return total amount
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

const fetchSalesGrowthRateFromDB = async () => {
  // Simulate a database call
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // Example data
      const data = [
        { date: "2024-01-01", totalSales: 1000 },
        { date: "2024-01-02", totalSales: 1500 },
        // Add more data here
      ];
      resolve(data);
    }, 1000);
  });
};

app.get("/api/transactions/salesGrowthRate", async (req, res) => {
  try {
    // Fetch sales growth rate data from the database
    const data = await fetchSalesGrowthRateFromDB();
    // Send the data as JSON response
    res.json(data);
  } catch (error) {
    // Log the error and send a 500 Internal Server Error response
    console.error("Error fetching sales growth rate:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Example Express route for fetching a user by ID
app.get("/api/users/:userId", (req, res) => {
  const userId = req.params.userId;

  // Logic to find the user in the database by userId
  Users.findById(userId)
    .then((user) => {
      if (!user) {
        return res.status(404).send({ message: "User not found" });
      }
      res.send(user);
    })
    .catch((err) => res.status(500).send({ message: "Error fetching user" }));
});

app.patch("/api/edituser/address", async (req, res) => {
  try {
    const { userId, addressData } = req.body;

    // Check if userId and addressData exist
    if (!userId || !addressData) {
      return res.status(400).json({ error: "Missing userId or addressData" });
    }

    // Perform the update in your database
    const updatedUser = await Users.findByIdAndUpdate(
      userId,
      { address: addressData },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    res
      .status(200)
      .json({ message: "User updated successfully", data: updatedUser });
  } catch (error) {
    console.error(error); // Log the actual error in your server
    res.status(500).json({ error: "Failed to update user" });
  }
});

// PATCH endpoint to update transaction status
app.patch("/api/transactions/:transactionId", async (req, res) => {
  const { transactionId } = req.params;
  const { status } = req.body; // Destructure status from the request body

  try {
    const updatedTransaction = await Transaction.findOneAndUpdate(
      { transactionId }, // Use transactionId to find the document
      { status }, // Update the status field
      { new: true } // Return the updated document
    );

    if (!updatedTransaction) {
      return res.status(404).send({ message: "Transaction not found" });
    }

    res.send(updatedTransaction);
  } catch (error) {
    res
      .status(500)
      .send({ message: "Error updating transaction status", error });
  }
});
app.post('/editproduct', upload.single('image'), async (req, res) => {
  const { _id, name, old_price, new_price, category, s_stock, m_stock, l_stock, xl_stock, stock } = req.body;

  console.log('Received ID:', _id);
  console.log('Received Image File:', req.file); // This should log the file details

  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(400).json({ success: false, message: 'Invalid product ID' });
  }

  try {
    const objectId = new mongoose.Types.ObjectId(_id);

    const updateData = {
      name,
      old_price,
      new_price,
      category,
      s_stock,
      m_stock,
      l_stock,
      xl_stock,
      stock,
    };

    // If an image file is provided, add its filename or URL to the updateData
    if (req.file) {
      updateData.image = req.file.filename;  // Or store URL based on your storage solution
    }

    const updatedProduct = await Product.findByIdAndUpdate(objectId, updateData, { new: true });

    if (!updatedProduct) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      product: updatedProduct,
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ success: false, message: 'Error updating product', error: error.message });
  }
});
//----------------RESET PASSWORD FOR SELLER--------------------//
app.post("/api/seller/forgot-password-seller", async (req, res) => {
  console.log("Forgot Password route hit");
  const { email } = req.body;

  // Check if email exists in your database
  try {
    const user = await Seller.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, errors: "Seller not found." });
    }

    // Generate OTP
    const otp = generateOTP(); // Function to generate OTP

    // Log the generated OTP
    console.log("Generated OTP for email:", email, "is:", otp); 

    user.otp = otp; // Save OTP to user record
    await user.save();

    // Send OTP to the user's email
    await sendEmail(user.email, `Your OTP: ${otp}`);

    return res
      .status(200)
      .json({ success: true, message: "OTP sent successfully." });
  } catch (error) {
    console.error("Error processing forgot password request:", error);
    res.status(500).json({ success: false, errors: "Internal server error." });
  }
});

app.post("/api/seller/verify-otp-seller", async (req, res) => {
  const { email, otp, newPassword } = req.body;

  // Check if the OTP is valid
  if (otpStore[email] !== otp) {
    return res.status(400).json({ success: false, errors: "Invalid OTP" });
  }

  // Clear OTP after successful verification
  delete otpStore[email];

  // Update user password
  try {
    const user = await Seller.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, errors: "User not found" });
    }
    user.password = newPassword; // Consider hashing the password before saving
    await user.save();
    res.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    console.error("Error updating password:", error);
    res
      .status(500)
      .json({ success: false, errors: "Failed to update password" });
  }
});

app.post("/api/seller/reset-password-seller", async (req, res) => {
  const { email, otp, newPassword } = req.body;

  try {
    const user = await Seller.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, errors: "Seller not found." });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ success: false, errors: "Invalid OTP." });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword; // Save the hashed password
    user.otp = null; // Clear OTP after successful reset

    await user.save();

    return res.status(200).json({ success: true, message: "Password updated successfully." });
    navi
  } catch (error) {
    console.error("Error processing reset password request:", error);
    res.status(500).json({ success: false, errors: "Internal server error." });
  }
});
app.post('/cart', async (req, res) => {
  const { userId, cartItems } = req.body;

  // Create an array of cart items based on incoming request
  const itemsToAdd = cartItems.map(item => ({
    productId: item.productId,
    size: item.size,
    price: item.price,
    quantity: item.quantity
  }));

  // Check if a cart exists for the user, if not create one
  let cart = await Cart.findOne({ userId });

  if (!cart) {
    cart = new Cart({ userId, cartItems: itemsToAdd });
  } else {
    // Add new items to the existing cart
    itemsToAdd.forEach(newItem => {
      const existingItemIndex = cart.cartItems.findIndex(existingItem => 
        existingItem.productId === newItem.productId && existingItem.size === newItem.size
      );

      if (existingItemIndex > -1) {
        // If the item already exists, update the quantity
        cart.cartItems[existingItemIndex].quantity += newItem.quantity;
      } else {
        // If it doesn't exist, add the new item
        cart.cartItems.push(newItem);
      }
    });
  }

  try {
    await cart.save();
    res.status(200).json({ message: 'Cart updated successfully' });
  } catch (error) {
    console.error('Error saving cart:', error);
    res.status(500).json({ message: 'Error saving cart', error });
  }
});

app.get('/api/cart/:userId', async (req, res) => {
  const { userId } = req.params;
  console.log("Fetching cart for user:", userId);  // Log the userId being used
  try {
      const cart = await Cart.findOne({ userId });
      if (!cart) {
          return res.status(404).json({ message: "No cart found for this user" });
      }
      res.status(200).json(cart);
  } catch (err) {
      console.error("Error fetching cart:", err);  // Log error details
      res.status(500).json({ message: "Server error", error: err.message });
  }
});

// DELETE item from the cart
app.delete('/api/cart/:userId/:productId', async (req, res) => {
  const { userId, productId } = req.params;
  const selectedSize = req.query.selectedSize;

  console.log(`DELETE request received for user: ${userId}, productId: ${productId}, selectedSize: ${selectedSize}`);

  // Find the user's cart
  const cart = await Cart.findOne({ userId });
  if (!cart) {
      console.log('Cart not found for user:', userId);
      return res.status(404).json({ message: 'Cart not found' });
  }

  console.log('Current cart items:', cart.cartItems);

  // Find the index of the item to be removed
  const itemIndex = cart.cartItems.findIndex(
      item => item.productId === parseInt(productId) && item.selectedSize === selectedSize
  );

  console.log(`Item index for productId ${productId} and selectedSize ${selectedSize}:`, itemIndex);

  // If item not found, return 404
  if (itemIndex === -1) {
      console.log('Item not found in the cart:', { productId, selectedSize });
      return res.status(404).json({ message: 'Item not found in the cart' });
  }

  // Remove the item
  console.log('Removing item:', cart.cartItems[itemIndex]);
  cart.cartItems.splice(itemIndex, 1);
  console.log('Cart items after removal:', cart.cartItems);

  // Save the updated cart to the database
  try {
      await cart.save(); // Ensure this line is present to persist changes
      console.log('Cart saved successfully:', cart.cartItems);
      res.status(200).json({ message: 'Item removed from database successfully' });
  } catch (error) {
      console.error('Error saving cart:', error);
      res.status(500).json({ message: 'Error saving updated cart' });
  }
});

// Halimbawa ng search route
app.get('/api/users/search', async (req, res) => {
  const searchTerm = req.query.term;
  
  try {
    const users = await Users.find({
      $or: [
        { name: { $regex: searchTerm, $options: 'i' } }, // case-insensitive search
        { email: { $regex: searchTerm, $options: 'i' } }
      ]
    });
    res.json(users);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Error fetching user" });
  }
});


//======================== M O B I L E ==================================//

// API to send OTP
app.post('/send-otp-mobile', (req, res) => {
  const { email } = req.body;
  console.log("Request Body:", req.body);

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }
    // Generate OTP
    const otp = otpGenerator.generate(6, {
      upperCaseAlphabets: false,
      specialChars: false,
    });

    otpStore[email] = otp;
    console.log(`Generated OTP for ${email}: ${otp}`);
  
    // Send OTP via email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your OTP Code",
      text: `Your OTP code is ${otp}`,
    };
  
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Error sending OTP:", error);
        return res
          .status(500)
          .json({ success: false, errors: "Failed to send OTP" });
      }
      console.log("OTP sent:", info.response);
      res.json({ success: true, message: "OTP sent to your email", otp: otp }); // Added the OTP in the response for testing purposes
    });
  });

//VERIFY-OTP FOR MOBILE

app.post('/verify-otp-mobile', (req, res) => {
  const { email, otp } = req.body;
  console.log("Request Body:", req.body);

  if (!email || !otp) {
    return res.status(400).json({ message: 'Email and OTP are required' });
  }

  // Check if OTP exists for the given email
  const storedOtp = otpStore[email];
  console.log(`Stored OTP for ${email}: ${storedOtp}`);

  if (!storedOtp) {
    return res.status(400).json({ success: false, message: 'No OTP found for this email' });
  }

  // Verify OTP
  if (storedOtp === otp) {
    // If OTP matches, delete it from the store (optional)
    delete otpStore[email];

    return res.json({ success: true, message: 'OTP verified successfully' });
  } else {
    return res.status(400).json({ success: false, message: 'Invalid OTP' });
  }
});

app.post('/get-user-id-by-email', async (req, res) => {
  const { email } = req.body;
  // Find user by email and return userId
  const user = await Users.findOne({ email: email });
  if (user) {
    return res.status(200).json({ userId: user._id });
  } else {
    return res.status(404).json({ message: 'User not found' });
  }
});

app.get('/get-user-details/:id', async (req, res) => {
  const userId = req.params.id;

  try {
    const user = await Users.findById(userId); // Select only the needed fields

    if (user) {
      console.log(user);
      return res.status(200).json({
          name: user.name,
          email: user.email,
          phone: user.phone,
          password: user.password,
      });
      
    } else {
      return res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
});

app.get('/get-user-address/:id', async (req, res) => {
  const userId = req.params.id;

  try {
    const user = await Users.findById(userId).select('address'); // Select only the address field

    if (user) {
      const { address } = user; // Destructure to get the address object
      return res.status(200).json({
        street: address.street,
        barangay: address.barangay,
        municipality: address.municipality,
        province: address.province,
        region: address.region,
        zip: address.zip,
        country: address.country,
      });
    } else {
      return res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error('Error fetching user address:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

app.post('/compare-password', async (req, res) => {
  const { userId, oldPassword } = req.body;

  try {
    // Fetch the user by ID
    const user = await Users.findById(userId);

    if (user) {
      // Directly compare plain text passwords
      if (user.password === oldPassword) {
        return res.status(200).json({ message: 'Password match' });
      } else {
        return res.status(400).json({ message: 'Old password is incorrect' });
      }
    } else {
      return res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
});


app.post('/updatepassword-mobile/:id', async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.params.id;

  try {
    const user = await Users.findById(userId); // Find user by ID

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Directly update the password without hashing
    user.password = newPassword; // Save new password as plaintext
    await user.save();

    return res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Check user address endpoint
app.post('/check-user-address', async (req, res) => {
  const { email } = req.body;

  try {
    const user = await Users.findOne({ email: email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.address) {
      return res.status(200).json({ addressExists: false, message: "No address found. Please set up your address first." });
    }

    return res.status(200).json({ addressExists: true, address: user.address });
  } catch (error) {
    console.error("Error checking user address:", error);
    return res.status(500).json({ message: "Error checking user address" });
  }
});

// Admin Routes
app.use("/api/admin", adminRoutes);
app.use("/api/", adminRoutes);
app.use("/api/seller", sellerRouter);
app.use("/api", sellerRouter);
app.use("/api", userRoutes);
