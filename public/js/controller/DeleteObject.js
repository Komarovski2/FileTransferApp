const { ObjectId } = require('mongodb');
const fileSystem = require('fs');

async function deleteFile(database, request, result) {
    const _id = request.fields._id;

    if (request.session.user) {
        var user = await database.collection("users").findOne({
            "_id": ObjectId(request.session.user._id)
        });

        var updatedArray = await removeFileReturnUpdated(user.uploaded, _id);
        for (var a = 0; a < updatedArray.length; a++) {
            updatedArray[a]._id = ObjectId(updatedArray[a]._id);
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

function removeFileReturnUpdated(arr, _id) {
    for (var a = 0; a < arr.length; a++) {
        if (arr[a].type != "folder" && arr[a]._id == _id) {
            // remove the file from uploads folder
            try {
                fileSystem.unlinkSync(arr[a].filePath);
            } catch (exp) {
                // 
            }
            // remove the file from array
            arr.splice(a, 1);
            break;
        }

        // do the recursion if it has sub-folders
        if (arr[a].type == "folder" && arr[a].files.length > 0) {
            arr[a]._id = ObjectId(arr[a]._id);
            removeFileReturnUpdated(arr[a].files, _id);
        }
    }

    return arr;
}

async function deleteFolder(database, request, result) {
    const _id = request.fields._id;

    if(request.session.user){
        var user = await database.collection("users").findOne({
            "_id": ObjectId(request.session.user._id)
        });

        var updatedArray = await removeFolderReturnUpdated(user.uploaded, _id)
        for ( var a = 0; a < updatedArray.length; a++ ){
            updatedArray[a]._id = ObjectId(updatedArray[a]._id);
        }

        await database.collection("users").updateOne({
            "_id": ObjectId(request.session.user._id)
        }, {
            $set: {
                "uploaded":updatedArray
            }
        });

        const backURL = request.header('Referer') || '/';
        result.redirect("/MyUploads");
        return false;
    }
    result.redirect("/Login");
}

function removeFolderReturnUpdated(arr, _id) {
    for (var a = 0; a < arr.length; a++) {
        if (arr[a].type == "folder") {
            if (arr[a]._id == _id) {
                try {
                    fileSystem.rmdirSync(arr[a].folderPath, { recursive: true });
                    console.log("Done");
                } catch (err) {
                    console.log(err);
                }

                arr.splice(a, 1);
                break;
            }

            if (arr[a].files.length > 0) {
                arr[a]._id = ObjectId(arr[a]._id);
                removeFolderReturnUpdated(arr[a].files, _id);
            }
        }
    }
    return arr;
}

module.exports = {
    deleteFile,
    deleteFolder
};
