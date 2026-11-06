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

        try {
            const result = await query.exec();
            res.status(200).json({message: "OK", data: result}); //adapted from README
        } catch (err) {
            res.status(500).json({message: "Error on Server", data: "Unable to get data"});
        }
    });

    return router;

}

