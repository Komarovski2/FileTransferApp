const { ObjectId } = require('mongodb');

async function GetUser(database, request, result) {
    const email = request.fields.email;

    if (request.session.user) {
        var user = await database.collection("users").findOne({
            "email": email
        });

        if (user == null) {
            result.json({
                "status": "error",
                "message": "User" + email + "does not exists"
            });
            return false;
        }

        if (!user.isVerified) {
            result.json({
                "status": "error",
                "message": "User" + user.name + "account is not verified."
            });
            return false;
        }
        result.json({
            "status": "success",
            "message": "Data has been fetched.",
            "user": {
                "_id": user._id,
                "name": user.name,
                "email": user.email
            }
        });
        return false;
    }
    result.json({
        "status": "error",
        "message": "Please login to perform this action"
    });
    return false;
}

async function Share(database,request, result) {
    const _id = request.fields._id;
    const type = request.fields.type;
    const email = request.fields.email;

    if (request.session.user) {
        var user = await database.collection("users").findOne({
            "email": email
        });

        if (user == null) {
            request.session.status = "error";
            request.session.message = "User" + email + "does not exists";
            result.redirect("/MyUploads")

            return false
        }

        if (!user.isVerified) {
            request.session.status = "error";
            request.session.message = "User" + user.name + "account is not verified.";
            result.redirect("/MyUploads")

            return false;
        }

        var me = await database.collection("users").findOne({
            "_id": ObjectId(request.session.user._id)
        });

        var file = null;
        if (type == "folder") {
            file = await recursiveGetFolder(me.uploaded, _id);
        } else {
            file = await recursiveGetFile(me.uploaded, _id)
        }

        if (file == null) {
            request.session.status = "error";
            request.session.message = "File does not exists.";
            result.redirect("/MyUploads");

            return false;
        }
        file._id = ObjectId(file._id);

        const sharedBy = me;

        await database.collection("users").findOneAndUpdate({
            "_id": user._id
        }, {
            $push: {
                "sharedWithMe": {
                    "_id": ObjectId(),
                    "file": file,
                    "sharedBy": {
                        "_id": ObjectId(sharedBy._id),
                        "name": sharedBy.name,
                        "email": sharedBy.email
                    },
                    "createdAt": new Date().getTime()
                }
            }
        });

        request.session.status = "success";
        request.session.message = "File has been shared with " + user.name + ".";

        const backURL = request.header("Referer") || "/";
        result.redirect(backURL)
    }
}

function recursiveGetFolder(files, _id) {
    var singleFile = null;
    for (var a = 0; a < files.length; a++) {
        const file = files[a];

        // return if file type is not folder and ID is found
        if (file.type == "folder") {
            if (file._id == _id) {
                return file;

            }

            // if it is a folder and have files, then do the recursion
            if (file.files.length > 0) {
                singleFile = recursiveGetFolder(file.files, _id);

                if (singleFile != null) {
                    return singleFile;
                }
            }
        }
    }
}

function recursiveGetFile(files, _id) {
    var singleFile = null;

    for (var a = 0; a < files.length; a++) {
        const file = files[a];

        if (file.type != "folder") {
            if (file._id == _id) {
                return file;
            }
        }

        if (file.type == "folder" && file.files.length > 0) {
            singleFile = recursiveGetFile(file.files, _id);

            if (singleFile != null) {
                return singleFile;
            }
        }
    }
}

module.exports = {
    GetUser,
    Share
};
