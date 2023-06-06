const { ObjectId } = require('mongodb');
var fileSystem = require("fs");

async function downloadFile(database, request, result) {
    const _id = request.fields._id;

    if (request.session.user) {
        var user = await database.collection("users").findOne({
            "_id": ObjectId(request.session.user._id)
        });

        var fileUploaded = await recursiveGetFile(user.uploaded, _id);
        var fileShared = await recursiveGetSharedFile(user.sharedWithMe, _id);

        if (fileUploaded == null && fileShared == null) {
            result.json({
                "status": "error",
                "message": "File is neither uploaded nor shared with you."
            });
            return false;
        }

        var file = (fileUploaded == null) ? fileShared : fileUploaded;

        fileSystem.readFile(file.filePath, function (error, data) {
            result.json({
                "status": "success",
                "message": "Data has been fetched.",
                "arrayBuffer": data,
                "fileType": file.type,
                "fileName": file.name
            });
        });
        return false;
    }

    result.json({
        "status": "error",
        "message": "Please login to perform this action."
    });
    return false;
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

function recursiveGetSharedFile(files, _id) {
    var singleFile = null;

    for (var a = 0; a < files.length; a++) {
        var file = (typeof files[a].file === "undefined") ? files[a] : files[a].file;

        if (file.type != "folder") {
            if (file._id == _id) {
                return file;
            }
        }
        if (file.type == "folder" && file.files.length > 0) {
            singleFile = recursiveGetSharedFile(file.files, _id)

            if (singleFile != null) {
                return singleFile;
            }
        }
    }
}

module.exports = {
    downloadFile
};
