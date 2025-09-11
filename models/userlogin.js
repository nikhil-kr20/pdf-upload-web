const mongoose = require('mongoose');

const userLoginSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});
module.exports = userLoginSchema;