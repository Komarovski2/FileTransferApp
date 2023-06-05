
const { ObjectId } = require('mongodb');



async function GetFileSharedWith(database, request, result) {

    const _id = request.fields._id;

    if(request.session.user){
        const tempUsers = await database.collection("users").find({
            $and: [{
                "sharedWithMe.file._id":ObjectId(_id)
            }, {
                "sharedWithMe.sharedBy._id": ObjectId(request.session.user._id)
            }]
        }).toArray();

        var users = [];
        for (var a = 0; a < tempUsers.length; a++){
            var sharedObj = null;
            for (var b = 0; b < tempUsers[a].sharedWithMe.length; b++){
                if(tempUsers[a].sharedWithMe[b].file._id == _id){
                    sharedObj = {
                        "_id":tempUsers[a].sharedWithMe[b]._id,
                        "sharedAt":tempUsers[a].sharedWithMe[b].createdAt,
                    };
                }
            }

            users.push({
                "_id":tempUsers[a]._id,
                "name":tempUsers[a].name,
                "email":tempUsers[a].email,
                "sharedObj":sharedObj
            });
        }
        result.json({
            "status":"success",
            "message":"Record has been fetched.",
            "users":users
        });
        return false;
    }

    result.json({
        "status":"error",
        "message":"Please login to perform this action."
});
};

async function RemoveSharedAccess(database, request, result) {

    const _id = request.fields._id;

    if (request.session.user) {
        const user = await database.collection("users").findOne({
            $and: [{
                "sharedWithMe._id": ObjectId(_id)
            }, {
                "sharedWithMe.sharedBy._id":ObjectId(request.session.user._id)
            }]
        });

        for (var a = 0; a < user.sharedWithMe.length; a++){
            if (user.sharedWithMe[a]._id == _id){
                user.sharedWithMe.splice(a, 1);
            }
        }
        await database.collection("users").findOneAndUpdate({
            $and: [{
                "sharedWithMe._id": ObjectId(_id)
            }, {
                "sharedWithMe.sharedBy._id":ObjectId(request.session.user._id)
            }]
        }, {
            $set:{
                "sharedWithMe":user.sharedWithMe
            }
        });

        request.session.status = "success";
        request.session.message = "Shared access has been removed.";

        const backURL = request.header('Referer') || '/';
        result.redirect(backURL);
        return false;
    }
    result.redirect("/Login")
};

module.exports = {
    GetFileSharedWith,
    RemoveSharedAccess
};

