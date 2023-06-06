const { ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');
var mainURL = "http://localhost:3000";

async function shareViaLink(database, request, result) {
    const _id = request.fields._id;

    if (request.session.user) {
        var user = await database.collection("users").findOne({
            "_id": ObjectId(request.session.user._id)
        });

        var file = await recursiveGetFile(user.uploaded, _id);
        var folder = await recursiveGetFolder(user.uploaded, _id);

        if (file == null && folder == null) {
            request.session.status = "error";
            request.session.message = "File does not exist";

            const backURL = request.header("Referer") || "/";
            result.redirect(backURL);
            return false;
        }

        if (folder != null) {
            folder.name = folder.folderName;
            folder.filePath = folder.folderPath;
            delete folder.files;
            file = folder;
        }

        bcrypt.hash(file.name, 10, async function (error, hash) {
            hash = hash.substring(10, 20);
            const link = mainURL + "/SharedViaLink/" + hash;
            await database.collection("public_links").insertOne({
                "hash": hash,
                "file": file,
                "uploadedBy": {
                    "_id": user._id,
                    "name": user.name,
                    "email": user.email
                },
                "createdAt": new Date().getTime()
            });

            request.session.status = "success";
            request.session.message = "Share link: " + link;

            const backURL = request.header("Referer") || "/";
            result.redirect(backURL);
        });

        return false;
    }

    result.redirect("/Login");
}

async function getSharedLink(database, request, result) {
    const hash = request.params.hash;

    var link = await database.collection("public_links").findOne({
        "hash": hash
    });

    if (link == null) {
        request.session.status = "error";
        request.session.message = "Link expired.";

        result.render("SharedViaLink", {
            "request": request
        });
        return false;
    }

    result.render("SharedViaLink", {
        "request": request,
        "link": link
    });
}

async function getMySharedLinks(database, request, result) {
    if (request.session.user) {
        var links = await database.collection("public_links").find({
            "uploadedBy._id": ObjectId(request.session.user._id)
        }).toArray();

        result.render("MySharedLinks", {
            "request": request,
            "links": links
        });
        return false;
    }

    result.redirect("/Login");
}

async function deleteLink(database, request, result) {
    const _id = request.fields._id;

    if (request.session.user) {
        var link = await database.collection("public_links").findOne({
            $and: [{
                "uploadedBy._id": ObjectId(request.session.user._id)
            }, {
                "_id": ObjectId(_id)
            }]
        });

        if (link == null) {
            request.session.status = "error";
            request.session.message = "Link does not exist.";

            const backURL = request.header("Referer") || "/";
            result.redirect(backURL);
            return false;
        }

        await database.collection("public_links").deleteOne({
            $and: [{
                "uploadedBy._id": ObjectId(request.session.user._id)
            }, {
                "_id": ObjectId(_id)
            }]
        });

        request.session.status = "success";
        request.session.message = "Link has been deleted.";

        const backURL = request.header("Referer") || "/";
        result.redirect(backURL);
        return false;
    }

    result.redirect("/Login");
}

function recursiveGetFile(files, _id){
    var singleFile = null;

    for( var a = 0; a < files.length; a++ ){
        const file = files[a];

        if (file.type != "folder"){
            if (file._id == _id){
                return file;
            }
        }

        if (file.type == "folder" && file.files.length > 0){
            singleFile = recursiveGetFile(file.files, _id);

            if (singleFile != null ){
                return singleFile;
            }
        }
    } 
 }

 function recursiveGetFolder (files, _id) {
    var singleFile = null;
    for (var a = 0; a < files.length; a++) {
        const file = files[a];

        // return if file type is not folder and ID is found
        if (file.type == "folder") {
            if (file._id == _id) {
                return file;
        
            }

        // if it is a folder and have files, then do the recursion
        if (file.files.length > 0){
            singleFile = recursiveGetFolder(file.files, _id);

            if (singleFile != null ){
                return singleFile;
            }
          }
        }
    }
}

module.exports = {
    shareViaLink,
    getSharedLink,
    getMySharedLinks,
    deleteLink
};
