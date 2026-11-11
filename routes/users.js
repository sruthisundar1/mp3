//adapted directly from devlab slides 

//loading file with require from https://nodejs.org/api/modules.html
//findOne usage from https://mongoosejs.com/docs/api/model.html#Model.findOne() 
//query sort from https://mongoosejs.com/docs/api/query.html#Query.prototype.sort() 
//findOneAndReplace and returnDocument help from https://mongoosejs.com/docs/api/model.html#Model.findOneAndReplace()
//session help from https://mongoosejs.com/docs/transactions.html 
//set help from https://www.mongodb.com/docs/manual/reference/operator/update/set/ 
const User = require('../models/user.js');
const Task = require('../models/task.js');

module.exports = function (router) {

    const usersRoute = router.route("/users");
    const usersIdRoute = router.route("/users/:id");

    usersRoute.post(async function (req, res) {

        const newUser = new User(req.body);
        newUser.dateCreated = Date.now(); //faq said dateCreated must be set by the server when the document is created
        const err = newUser.validateSync();

        if (err) {
            return res.status(400).json({message: "Bad Request", data: "A user name or email is missing/wrong type"});
        }

        const foundUser = await User.findOne({ email: newUser.email }); // https://mongoosejs.com/docs/api/model.html#Model.findOne()
        if (foundUser) {
            return res.status(400).json({message: "Bad Request", data: "This email is used by another user."});
        }

        let savedUser = null;
        try {
            // Mongoose will commit the transaction if the async function
            // executes successfully and attempt to retry if there was a retriable error.
            await User.db.transaction(async (session) => {

                // Multiple db queries (i.e re-assigning tasks) can have concurrency issues
                //   Lost updates, Inconsistent retrieval, etc
                savedUser = await newUser.save({session: session}); //claude help 
            });
        } catch (e) {
            return res.status(500).json({message: "Internal Server Error", data: "User unable to be created"});
        }
        // ...
        res.status(201).json({message: "Created", data: savedUser});
    });

    usersRoute.get(async function (req, res) {

        // mongoose query builder
        const query = User.find();
        query.collection(User.collection);

        // TODO: Add query conditions (where, limit, etc)
        // if (req.query["where"]) { query.where(...); }
        
        //query sort from https://mongoosejs.com/docs/api/query.html#Query.prototype.sort() 
        try { //claude help
            if (req.query["where"]) {
                query.where(JSON.parse(req.query["where"]));
            }
            if (req.query["sort"]) {
                query.sort(JSON.parse(req.query["sort"]));
            }
            if (req.query["select"]) {
                query.select(JSON.parse(req.query["select"]));
            }
            if (req.query["skip"]) {
                query.skip(JSON.parse(req.query["skip"]));
            }
            if (req.query["limit"]) {
                query.limit(JSON.parse(req.query["limit"]));
            }
        } catch (err) {
            return res.status(400).json({message: "Bad Request", data: "Invalid JSON value in a parameter."});
        }
        try { //claude help
            if (req.query["count"] === "true") {
                query.countDocuments();
            }
            const results = await query.exec();
            res.status(200).json({ message: "OK", data: results });
        } catch (err) {
            if (err.name === "CastError") {
                return res.status(400).json({ message: "Bad Request", data: "Invalid JSON value in a parameter." });
            }
            res.status(500).json({ message: "Internal Server Error", data: "Not able to get data" });
        }
    });

    usersIdRoute.get(async function (req, res) {

        const userId = req.params["id"];
        const query = User.findById(userId);
        query.collection(User.collection);

        // TODO: Add query conditions (where, limit, etc)
        //   if (req.query["where"]) { query.where(...); }

        try {
            if (req.query["select"]) {
                query.select(JSON.parse(req.query["select"]));
            }
            const result = await query.exec();
            if (result === null) {
                return res.status(404).json({message: "Not Found", data: "User not found"});
            }
            res.status(200).json({message: "OK", data: result});
        } catch (err) {
            if (err.name === "CastError") {
                return res.status(404).json({message: "Not Found", data: "User not found"});
            }
            if (err.name === "SyntaxError") {
                return res.status(400).json({message: "Bad Request", data: "Invalid JSON value in a parameter."});
            }
            res.status(500).json({message: "Internal Server Error", data: "Not able to get data"});
        }

    })

    //claude help 
    usersIdRoute.delete(async function (req, res) {

        const userId = req.params["id"];

        let deletedUser = null;
        try {
            await Task.db.transaction(async (session) => {

                deletedUser = await User.findByIdAndDelete(userId, {session: session});
                if (deletedUser !== null) {
                    await Task.updateMany(
                        {assignedUser : userId},
                        {$set: {assignedUser: "", assignedUserName: "unassigned"}},
                        {session: session}
                    );
                }
            });
        } catch (err) {
            if (err.name === "CastError") {
                return res.status(404).json({message: "Not Found", data: "User not found"});
            }
            return res.status(500).json({message: "Internal Server Error", data: "User not able to be deleted"});
        }
        if (deletedUser === null) {
            return res.status(404).json({message: "Not Found", data: "User not found"});
        }
        return res.status(204).end();
    });
    //findOneAndReplace and returnDocument help from https://mongoosejs.com/docs/api/model.html#Model.findOneAndReplace()
    //session help from https://mongoosejs.com/docs/transactions.html 
    //set help from https://www.mongodb.com/docs/manual/reference/operator/update/set/ 
    usersIdRoute.put(async function (req, res) {
        const userId = req.params["id"];
        const query = User.findById(userId);
        query.collection(User.collection);

        let currUser = null;
        try {
            currUser = await query.exec();
        } catch (err) {
            return res.status(404).json({message: "Not Found", data: "User not found"});
        }
        if (currUser === null) {
            return res.status(404).json({message: "Not Found", data: "User not found"});
        }

        if (req.body.pendingTasks !== undefined && Array.isArray(req.body.pendingTasks) === false) {
            return res.status(400).json({message: "Bad Request", data: "pendingTasks has to be a list"});
        }

        const updatedUser = new User(req.body);
        updatedUser._id = currUser._id;
        updatedUser.dateCreated = currUser.dateCreated;
        const err = updatedUser.validateSync();

        if (err) {
            return res.status(400).json({message: "Bad Request", data: "A user name or email is missing/wrong type"});
        }

        const taskIds = updatedUser.pendingTasks;

        let foundTasks = [];
        try {
            foundTasks = await Task.find({_id: {$in: taskIds}});
        } catch (err) {
            return res.status(400).json({message: "Bad Request", data: "pendingTasks has an invalid id"});
        }

        const foundUser = await User.findOne({email: updatedUser.email});
        if (foundUser !== null && foundUser._id.toString() !== currUser._id.toString()) {
            return res.status(400).json({message: "Bad Request", data: "This email is used by another user."});
        }

        if (foundTasks.length !== taskIds.length) {
            return res.status(404).json({message: "Not Found", data: "A task in pendingTasks does not exist"});
        }

        for (const task of foundTasks) {
            if (task.completed === true) {
                return res.status(400).json({message: "Bad Request", data: "A completed task cannot be in pendingTasks"});
            }
        }

        let savedUser = null;
        try {
            // Mongoose will commit the transaction if the async function
            // executes successfully and attempt to retry if there was a retriable error.
            await User.db.transaction(async (session) => {

                // Multiple db queries (i.e re-assigning tasks) can have concurrency issues
                //   Lost updates, Inconsistent retrieval, etc
                await User.updateMany(
                    {},
                    {$pull: {pendingTasks: {$in: taskIds}}},
                    {session: session}
                );

                await Task.updateMany(
                    {assignedUser: userId, completed: false, _id: {$nin: taskIds}},
                    {$set: {assignedUser: "", assignedUserName: "unassigned"}},
                    {session: session}
                );

                await Task.updateMany(
                    {_id: {$in: taskIds}},
                    {$set: {assignedUser: userId}},
                    {session: session}
                );

                await Task.updateMany(
                    {assignedUser: userId},
                    {$set: {assignedUserName: updatedUser.name}},
                    {session: session}
                );

                savedUser = await User.findOneAndReplace(
                    {_id: userId},
                    updatedUser.toObject(),
                    {session: session, returnDocument: "after"}
                );
            });
        } catch (e) {
            return res.status(500).json({message: "Internal Server Error", data: "User not able to be updated."});
        }
        res.status(200).json({message: "OK", data: savedUser});
    });
        
    return router;

}

