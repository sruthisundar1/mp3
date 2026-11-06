// Load required packages
var mongoose = require('mongoose');

// Define our user schema
var UserSchema = new mongoose.Schema({
    name: { type: String, required: [true, "name is required"] },
    email: { type: String, required: [true, "email is required"], unique: true },
    pendingTasks: [String],
    dateCreated: { type: Date, default: Date.now} //claude assistance, also in backend lecture
});

// Export the Mongoose model
module.exports = mongoose.model('User', UserSchema);
