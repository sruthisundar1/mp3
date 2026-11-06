// Load required packages
var mongoose = require('mongoose');

// Define our task schema
//following readme's suggestions for default/required values
var TaskSchema = new mongoose.Schema({
    name: { type: String, required: [true, "name is required"] },
    description: { type: String, default: "" },
    deadline: { type: Date, required: [true, "deadline is required"] },
    completed: { type: Boolean, default: false },
    assignedUser: { type: String, default: "" },
    assignedUserName: { type: String, default: "unassigned" },
    dateCreated: { type: Date, default: Date.now} //claude assistance, also in backend lecture
});

// Export the Mongoose model
module.exports = mongoose.model('Task', TaskSchema);
