//adapted directly from devlab slides 

//loading file with require from https://nodejs.org/api/modules.html
const User = require('../models/user.js');

module.exports = function (router) {

    const usersRoute = router.route("/users");
    const usersIdRoute = router.route("/users/:id");

    usersRoute.get(async function (req, res) {

        // mongoose query builder
        const query = User.find();
        query.collection(User.collection);

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

