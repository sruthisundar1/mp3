//adapted directly from devlab slides 

//loading file with require from https://nodejs.org/api/modules.html
//findOne usage from https://mongoosejs.com/docs/api/model.html#Model.findOne() 
const User = require('../models/user.js');

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

        try {
            const result = await query.exec();
            res.status(200).json({message: "OK", data: result}); //adapted from README
        } catch (err) {
            res.status(500).json({message: "Error on Server", data: "Unable to get data"});
        }
    });

    return router;

}

