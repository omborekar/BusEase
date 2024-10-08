const express = require("express");
const app = express();
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer"); // Import nodemailer
const path = require("path");
const port = process.env.PORT || 3000;
require("./db/conn");
const Register = require("./models/register");
const static_path = path.join(__dirname, "../src/public");
const Passenger = require("./models/passenger");

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(static_path));

app.set("view engine", "hbs");

// Variables to store OTP and email for verification
let otp = null;
let otpEmail = null;

// Nodemailer transporter setup with hardcoded credentials
const transporter = nodemailer.createTransport({
  service: "Gmail", // Use your email service (Gmail, SendGrid, etc.)
  auth: {
    user: "omborekar18@gmail.com", // Replace with your email
    pass: "optnaaagpvbhkogm", // Replace with your email password or app password
  },
});

// Routes
app.get("/", (req, res) => {
  res.render("main");
});
app.get("/register", (req, res) => {
  res.render("register");
});
app.get("/login", (req, res) => {
  res.render("login");
});
app.get("/logout", (req, res) => {
  res.render("main");
});
app.get("/main", (req, res) => {
  res.render("main");
});

// Registration Route to Send OTP
app.post("/register", async (req, res) => {
  const { name, email, password, cPassword } = req.body;
console.log( name, email, password, cPassword )
  // Check for password match
  if (password !== cPassword) {
    return res.status(400).send({ message: "Passwords do not match" });
  }

  // Generate and send OTP
  otpEmail = email;
  otp = Math.floor(1000 + Math.random() * 9000).toString(); // Generate 4-digit OTP
  console.log(otp);
  try {
    // Sending OTP via email
    await transporter.sendMail({
      from: "omborekar18@gmail.com", // Replace with your email
      to: otpEmail,
      subject: "Your OTP Code for Registration",
      text: `Your OTP code is ${otp}. Please verify your email.`,
    });

    // Respond with message to verify OTP
    res.status(200).send({ message: "OTP sent to your email. Please verify." });
  } catch (error) {
    return res.status(500).send({ message: "Error sending OTP", error: error.message });
  }
});

// Verify OTP Route
app.post("/verify-otp", async (req, res) => {
  const { enteredOtp, userName, userEmail, userPassword } = req.body; 
  console.log('==>', enteredOtp);
  console.log("Incoming data:", { userName, userEmail, userPassword });

  if (!userName || !userEmail || !userPassword) {
      return res.status(400).json({ message: "All fields are required." });
  }

  if (otp === enteredOtp) {
      try {
          console.log("OTP verified, proceeding with registration");
          const hashedPassword = await bcrypt.hash(userPassword, 10); // Hash password
          console.log("Hashed Password:", hashedPassword);

          const registerUser = new Register({
              name: userName,
              email: userEmail,
              password: hashedPassword, // Store hashed password
          });
          console.log("User object to save:", registerUser); // Log the user object

          const registerd = await registerUser.save(); // Attempt to save to database
          console.log("Saved user:", registerd); // Log saved user data
          otp = null; // Clear OTP after successful registration
          otpEmail = null; // Clear email after registration

          res.status(201).json({ message: "User registered successfully" }); // Send success message
      } catch (error) {
          console.error("Error during user registration:", error);
          if (error.code) {
              console.error("Error code:", error.code); // Log specific error code
          }
          if (error.message) {
              console.error("Error message:", error.message); // Log specific error message
          }
          if (error.keyValue) {
              console.error("Key value causing the error:", error.keyValue); // Log the key value that caused the error
          }
          if (error.errors) {
              console.error("Validation errors:", error.errors); // Log validation errors if any
          }
          if (error.name) {
              console.error("Error name:", error.name); // Log error name
          }

          if (error.code === 11000) {
              // Duplicate key error
              return res.status(409).json({ message: "Email already exists." });
          }
          return res.status(400).json({ message: "Error registering user", error: error.message });
      }
  } else {
      // OTP is incorrect
      res.status(400).json({ message: "Invalid OTP" });
  }
});



// Login Route
let logEmail;
let logname;
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Log received email and password (for debugging purposes)
    console.log("Login attempt:", { email, password });

    // Find user by email
    const userEmail = await Register.findOne({ email });
    
    // If user does not exist, return a 401 error (Unauthorized)
    if (!userEmail) {
      console.log("User not found for email:", email);
      return res.status(401).json({ message: "Invalid login details!" });
    }

    // Compare the password with the hashed password in the database
    const isMatch = await bcrypt.compare(password, userEmail.password);
    
    // If password matches, redirect to /index
    if (isMatch) {
      console.log("Login successful for:", email);
      
      logEmail = email;  // Assuming you are storing logged-in user's email
      logname = userEmail.name;  // Assuming you are storing logged-in user's name

      return res.status(200).redirect("/index");
    } else {
      console.log("Password mismatch for email:", email);
      return res.status(401).json({ message: "Invalid login details!" });
    }

  } catch (error) {
    // Log the error for debugging
    console.error("Error during login:", error);
    
    // Return a 500 status code for server-side errors
    return res.status(500).json({ message: "An error occurred during login. Please try again." });
  }
});

app.post('/bookBus', async (req, res) => {
  const { passengers, busInfo } = req.body;

  // Include the global logEmail in each passenger document
  const passengerDocuments = passengers.map(passenger => ({
      ...passenger, // Spread the passenger data
      email: logEmail, // Use the global logEmail variable
      busInfo: {
          source: busInfo.source,
          destination: busInfo.destination,
          date: busInfo.date,
          time: busInfo.time,
          fare: busInfo.fare
      }
  }));

  try {
      await Passenger.insertMany(passengerDocuments);
      res.status(200).json({ message: 'Booking successful' });
  } catch (error) {
      console.error('Error booking bus:', error);
      res.status(500).json({ message: 'Error booking bus', error });
  }
});


// Route to fetch booking history for the logged-in user
app.get("/api/booking-history", async (req, res) => {
  try {
    if (!logEmail) {
      return res.status(401).json({ message: "User not logged in." });
    }
    
    const bookings = await Passenger.find({ email: logEmail }); // Fetch bookings for the logged-in user
    if (bookings.length === 0) {
      return res.status(404).json({ message: "No bookings found for this email." });
    }
    res.status(200).json(bookings);
  } catch (error) {
    console.error("Error fetching booking history:", error);
    res.status(500).json({ message: "Error fetching booking history" });
  }
});

app.delete("/api/cancel-booking", async (req, res) => {
  try {
    const { name, source, destination, date, time } = req.body;  // Extract details from request body

    if (!logEmail || !name || !source || !destination || !date || !time) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Find and delete the booking based on email, name, and bus details
    const deletedBooking = await Passenger.findOneAndDelete({
      email: logEmail,  // Currently logged-in user's email
      name: name,  // Name of the passenger
      "busInfo.source": source,
      "busInfo.destination": destination,
      "busInfo.date": date,
      "busInfo.time": time,
    });

    if (!deletedBooking) {
      return res.status(404).json({ message: "Booking not found or already canceled." });
    }

    res.status(200).json({ message: "Booking canceled successfully!" });
  } catch (error) {
    console.error("Error canceling booking:", error);
    res.status(500).json({ message: "Error canceling booking", error: error.message });
  }
});


app.get("/index", (req, res) => {
  res.render("index",{username:logname});
});

app.get("/bookBus", (req, res) => {
  res.render("bookBus",{username:logname});
});
app.get("/booked", (req, res) => {
  res.render("booked",{username:logname});
});
app.get("/bookHis", (req, res) => {
  res.render("bookHis",{username:logname});
});

app.listen(port, () => {
  console.log(`Connected! Server running on port ${port}`);
  console.log(`open the following link to see: http://localhost:${port}`);
});
