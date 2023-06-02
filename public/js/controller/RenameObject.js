const fileSystem = require("fs");
const { ObjectId } = require('mongodb');


async function renameFile(database, request, result) {
    const _id = request.fields._id;
    const name = request.fields.name;

    if (request.session.user) {
        var user = await database.collection("users").findOne({
            "_id": ObjectId(request.session.user._id)
        });

        var updatedArray = await renameFileReturnUpdated(user.uploaded, _id, name);
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
    result.redirect("/Login")
}

async function renameFolder(database, request, result) {
    const _id = request.fields._id;
    const name = request.fields.name;

    if (request.session.user) {
        var user = await database.collection("users").findOne({
            "_id": ObjectId(request.session.user._id)
        });

        var updatedArray = await renameFolderReturnUpdated(user.uploaded, _id, name);
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
    result.redirect("/Login")
}

function renameFileReturnUpdated(arr, _id , newName){
    for (var a = 0; a < arr.length; a++){
        if (arr[a].type != "folder"){
            if (arr[a]._id == _id){

                const oldFileName = arr[a].name;
                var filePathParts = arr[a].filePath.split("/")

                var newFilePath = "";
                for (var b = 0; b < filePathParts.length; b++){
                    if( filePathParts[b] == oldFileName){
                        filePathParts[b] = newName;
                    }

                    newFilePath += filePathParts[b];
                    if (b < filePathParts.length -1 ){
                        newFilePath += "/";
                    }
                }
                fileSystem.rename(arr[a].filePath, newFilePath,
                    function(error){
                        //
                    });
                    arr[a].name = newName;
                    arr[a].filePath = newFilePath;
                    break;
             }
        }

        if (arr[a].type == "folder" && arr[a].files.length > 0){
            renameFileReturnUpdated(arr[a].files, _id, newName);
        }
    }
    return arr;
}

function renameFolderReturnUpdated(arr, _id, newName){
    for (var a = 0; a < arr.length; a++){
        if (arr[a].type == "folder"){
            if (arr[a]._id == _id){
                const oldFolderName = arr[a].folderName;
                var folderPathParts = arr[a].folderPath.split("/");

                var newFolderPath = "";
                for (var b = 0; b < folderPathParts.length; b++){
                    if( folderPathParts[b] == oldFolderName){
                        folderPathParts[b] = newName;
                    }
                    newFolderPath +=folderPathParts[b];

                    if (b < folderPathParts.length - 1){
                        newFolderPath += "/";
                    }
                }
                fileSystem.rename(arr[a].folderPath, newFolderPath,
                    function(error){
                        //
                    });
                    arr[a].folderName = newName;
                    arr[a].folderPath = newFolderPath;

                    renameSubFolders(arr[a].files, oldFolderName, newName);
                    break;
            }
            if (arr[a].files.length > 0){
                renameFolderReturnUpdated(arr[a].files, _id, newName);
            }
        }
    }

    return arr;
}

function renameSubFolders(arr, oldName, newName){
    for (var a = 0; a <arr.length; a++){
        var pathParts = (arr[a].type == "folder") ? 
        arr[a].folderPath.split("/") : arr[a].filePath.split("/");

        var newPath = "";
        for (var b = 0; b < pathParts.length; b++){
            if(pathParts[b] == oldName){
                pathParts[b] = newName;
            }
            newPath +=pathParts[b];
            if (b < pathParts.length - 1){
                newPath += "/";
            }
        }
        if (arr[a].type == "folder"){
            arr[a].folderPath = newPath;

            if(arr[a].files.length > 0){
                renameSubFolders(arr[a].files, _id, newName)
            }
        } else {
            arr[a].filePath =  newPath;
        }
    }
}

module.exports = {
    renameFile,
    renameFolder
};
