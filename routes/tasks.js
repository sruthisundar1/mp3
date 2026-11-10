//adapted directly from devlab slides 

//loading file with require from https://nodejs.org/api/modules.html
const Task = require('../models/task.js');

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

    return router;

}

