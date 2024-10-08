const mongoose = require("mongoose");

mongoose
  .connect("mongodb://localhost:27017/loginData", {
    useNewUrlparser: true,
    useUnifiedTopology: true,
    // useCreateIndex: true,
  })
  .then(() => {
    console.log("Connection to MongoDB successful!");
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB:", error.message);
  });
