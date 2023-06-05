const { ObjectId } = require('mongodb');


async function SharedWithMe(database, request, result) {
    const _id = request.params._id;
    
    if(request.session.user){
        var user = await database.collection("users").findOne({
            "_id": ObjectId(request.session.user._id)
        });

        var files = null;
        var folderName = "";
        if (typeof _id == "undefined"){
            files = user.sharedWithMe;
        } else {
            var folderObj = await recursiveGetSharedFolder(user.sharedWithMe, _id)

            if (folderObj == null){
                request.status = "error";
                request.message = "Folder not found.";
                result.render("Error",{
                    "request":request
                });
                return false;
            }
            files = folderObj.files;
            folderName = folderObj.folderName;
    }
    if (files == null) {
        request.status = "error";
        request.message = "Directory not found.";
        result.render("Error",{
            "request":request
        });
        return false;
    }
    result.render("SharedWithMe",{
        "request":request,
        "files":files,
        "_id":_id,
        "folderName":folderName
    });
    return false;
}
result.redirect("/Login")
};

async function DeleteSharedDirectory(database, request, result) {
    const _id = request.fields._id;

    if(request.session.user){
        var user = await database.collection("users").findOne({
            "_id": ObjectId(request.session.user._id)
        });

        var updatedArray = await 
        removeSharedFolderReturnUpdated(user.sharedWithMe,_id)
        for(var a = 0; a < updatedArray.length; a++){
            updatedArray[a]._id = ObjectId(updatedArray[a]._id);
        }
        await database.collection("users").updateOne({
            "_id":ObjectId(request.session.user._id)
        },{
            $set:{
                "sharedWithMe":updatedArray
            }
        });

        const backURL = request.header('Referer') || '/';
        result.redirect(backURL);
        return false;
    }
    result.redirect("/Login");
};

async function DeleteSharedFile(database, request, result) {
    const _id = request.fields._id;

    if (request.session.user){
        var user = await database.collection("users").findOne({
            "_id": ObjectId(request.session.user._id)
        });

        var updatedArray = await removeSharedFileReturnUpdated(user.sharedWithMe, _id)
        for (var a = 0; a < updatedArray.length; a++){
            updatedArray[a]._id = ObjectId(updatedArray[a]._id);
        }
        await database.collection("users").updateOne({
            "_id":ObjectId(request.session.user._id)
        }, {
            $set:{
                "sharedWithMe":updatedArray
            }
        });
        const backURL = request.header('Referer') || '/';
        result.redirect(backURL);
        return false;
    }
    result.redirect("/Login");
};

function removeSharedFolderReturnUpdated (arr, _id){
    for(var a = 0; a < arr.length; a++){
        var file = (typeof arr[a].file === "undefined") ? arr[a] : arr[a].file;

        if( file.type == "folder"){
            if (file._id == _id){
                arr.splice(a,1);
                break;
            }

            if (file.files.length > 0){
                file._id = ObjectId(file._id);
                removeSharedFolderReturnUpdated(file.files, _id)
            }
        }
    }
    return arr;
}

function removeSharedFileReturnUpdated (arr, _id){
    for (var a = 0; a < arr.length;a++){
        var file = (typeof arr[a].file === "undefined") ? arr[a] : arr[a].file;

        if (file.type != "folder" && file._id == _id){
            arr.splice(a, 1);
            break;
        }

        if (file.type == "folder" && file.files.length > 0){
            arr[a]._id = ObjectId(arr[a]._id);
            removeSharedFileReturnUpdated(file.files, _id);
        }
    }
    return arr;
}

function recursiveGetSharedFolder (files, _id){
    var singleFile = null;

    for (var a = 0; a < files.length; a++){
        var file = (typeof files[a].file === "undefined") ? files[a]:
        files[a].file;

        if (file.type == "folder") {
            if (file._id == _id) {
            return file;
        }

        if(file.files.length > 0){
            singleFile = recursiveGetSharedFolder(file.files, _id);

            if (singleFile != null){
                return singleFile;
            }
        }
    }
}
}

module.exports = {
    SharedWithMe,
    DeleteSharedFile,
    DeleteSharedDirectory
};

