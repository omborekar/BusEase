const mongoose = require("mongoose");

const passengerSchema = new mongoose.Schema({
    name: String,
    age: Number,
    gender: String,
    contact: String,
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
    },
    busInfo: {
        source: String,
        destination: String,
        date: String,
        time: String,
        fare: Number,
    },
});

const Passenger = mongoose.model("Passenger", passengerSchema);
module.exports = Passenger;
