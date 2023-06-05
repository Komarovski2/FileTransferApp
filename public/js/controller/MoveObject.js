const { ObjectId } = require('mongodb');
const fileSystem = require('fs');

async function moveFile(database, request, result) {
    const _id = request.fields._id;
    const type = request.fields.type;
    const folder = request.fields.folder;

    if (request.session.user) {
        var user = await database.collection("users").findOne({
            "_id": ObjectId(request.session.user._id)
        });

        var updatedArray = user.uploaded;

        if (type == "folder") {
            var moveFolder = await recursiveGetFolder(user.uploaded, _id);
            var moveToFolder = await recursiveGetFolder(user.uploaded, folder);

            updatedArray = await moveFolderReturnUpdated(
                user.uploaded, _id, moveFolder, moveToFolder);

            updatedArray = await updateMovedToFolderParent_ReturnUpdated(
                updatedArray, folder, moveFolder);
        }

        await database.collection("users").updateOne({
            "_id": ObjectId(request.session.user._id)
        }, {
            $set: {
                "uploaded": updatedArray
            }
        });

        const backURL = request.header('Referer') || '/';
        result.redirect(backURL);
        return false;
    }

    result.redirect("/Login");
}

function updateMovedToFolderParent_ReturnUpdated(arr, _id, moveFolder) {
    for (var a = 0; a < arr.length; a++) {
        if (arr[a].type == "folder") {
            if (arr[a]._id == _id) {
                moveFolder.folderPath = arr[a].folderPath + "/" + moveFolder.folderName;
                arr[a].files.push(moveFolder);
                break;
            }

            if (arr[a].files.length > 0) {
                arr[a]._id = ObjectId(arr[a]._id);
                updateMovedToFolderParent_ReturnUpdated(arr[a].files, _id, moveFolder);
            }
        }
    }
    return arr;
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

function moveFolderReturnUpdated(arr, _id, moveFolder, moveToFolder) {
    for (var a = 0; a < arr.length; a++) {
        if (arr[a].type == "folder") {
            if (arr[a]._id == _id) {
                const newPath = moveToFolder.folderPath + "/" + arr[a].folderName;
                fileSystem.rename(arr[a].folderPath, newPath, function () {
                    console.log("Folder has been moved.")
                });

                arr.splice(a, 1);
                break;
            }

            if (arr[a].files.length > 0) {
                arr[a]._id = ObjectId(arr[a]._id);
                moveFolderReturnUpdated(arr[a].files, _id, moveFolder, moveToFolder);
            }
        }
    }
    return arr;
}

async function getAllFolders(database, request, result) {
    const _id = request.fields._id;
    const type = request.fields.type;

    if (request.session.user) {
        var user = await database.collection("users").findOne({
            "_id": ObjectId(request.session.user._id)
        });

        var tempAllFolders = recursiveGetAllFolders(user.uploaded, _id);
        var folders = [];
        for (var a = 0; a < tempAllFolders.length; a++) {
            folders.push({
                "_id": tempAllFolders[a]._id,
                "folderName": tempAllFolders[a].folderName
            });
        }
        result.json({
            "status": "success",
            "message": "Record has been fetched.",
            "folders": folders
        });
        return false;
    }

    result.json({
        "status": "error",
        "message": "Please login to perform this action."
    });
}

function recursiveGetAllFolders(files, _id) {
    var folders = [];

    for (var a = 0; a < files.length; a++) {
        const file = files[a];

        if (file.type == "folder") {
            if (file._id != _id) {
                folders.push(file);
                if (file.files.length > 0) {
                    var tempFolders = recursiveGetAllFolders(file.files, _id);

                    for (var b = 0; b < tempFolders.length; b++) {
                        folders.push(tempFolders[b]);
                    }
                }
            }
        }
    }
    return folders;
}

module.exports = {
    moveFile,
    updateMovedToFolderParent_ReturnUpdated,
    recursiveGetFolder,
    moveFolderReturnUpdated,
    getAllFolders
  };
