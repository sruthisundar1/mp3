//adapted directly from devlab slides 

//loading file with require from https://nodejs.org/api/modules.html
const Task = require('../models/task.js');
const User = require('../models/user.js');

module.exports = function (router) {

    const tasksRoute = router.route("/tasks");
    const tasksIdRoute = router.route("/tasks/:id");

    tasksRoute.get(async function (req, res) {

        // mongoose query builder
        const query = Task.find();
        query.collection(Task.collection);

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
            } else if (req.query["count"] !== "true") {
                query.limit(100); // default should be 100 for tasks from README
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

    tasksRoute.post(async function (req, res) {
        const newTask = new Task(req.body);
        newTask.dateCreated = Date.now(); //faq said dateCreated must be set by the server when the document is created
        const err = newTask.validateSync();

        if (err) {
            return res.status(400).json({message: "Bad Request", data: "A task name or deadline is missing/wrong type"});
        }

        let savedTask = null;
        try {
            // Mongoose will commit the transaction if the async function
            // executes successfully and attempt to retry if there was a retriable error.
            await Task.db.transaction(async (session) => {

                // Multiple db queries (i.e re-assigning tasks) can have concurrency issues
                //   Lost updates, Inconsistent retrieval, etc
                savedTask = await newTask.save({session: session}); //claude help 
            });
        } catch (e) {
            return res.status(500).json({message: "Internal Server Error", data: "Task unable to be created"});
        }
        // ...
        res.status(201).json({message: "Created", data: savedTask});
    });

    tasksIdRoute.get(async function (req, res) {
    
            const taskId = req.params["id"];
            const query = Task.findById(taskId);
            query.collection(Task.collection);
    
            // TODO: Add query conditions (where, limit, etc)
            //   if (req.query["where"]) { query.where(...); }
    
            try {
                if (req.query["select"]) {
                    query.select(JSON.parse(req.query["select"]));
                }
                const result = await query.exec();
                if (result === null) {
                    return res.status(404).json({message: "Not Found", data: "Task not found"});
                }
                res.status(200).json({message: "OK", data: result});
            } catch (err) {
                if (err.name === "CastError") {
                    return res.status(404).json({message: "Not Found", data: "Task not found"});
                }
                if (err.name === "SyntaxError") {
                    return res.status(400).json({message: "Bad Request", data: "Invalid JSON value in a parameter."});
                }
                res.status(500).json({message: "Internal Server Error", data: "Not able to get data"});
            }
    
        })
    //claude help 
    tasksIdRoute.delete(async function (req, res) {

        const taskId = req.params["id"];

        let deletedTask = null;
        try {
            await Task.db.transaction(async (session) => {

                deletedTask = await Task.findByIdAndDelete(taskId, {session: session});
                if (deletedTask !== null && deletedTask.assignedUser) {
                    await User.updateOne(
                        {_id: deletedTask.assignedUser},
                        {$pull: {pendingTasks: taskId}},
                        {session: session}
                    );
                }
            });
        } catch (err) {
            if (err.name === "CastError") {
                return res.status(404).json({message: "Not Found", data: "Task not found"});
            }
            return res.status(500).json({message: "Internal Server Error", data: "Task not able to be deleted"});
        }
        if (deletedTask === null) {
            return res.status(404).json({message: "Not Found", data: "Task not found"});
        }
        res.status(200).json({message: "OK", data: deletedTask});
    });
    

    return router;

}

