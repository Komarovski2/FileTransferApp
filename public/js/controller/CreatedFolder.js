const fileSystem = require('fs');
const { ObjectId } = require('mongodb');

async function CreateFolder(database, request, result) {

    const name = request.fields.name;
    const _id =  request.fields._id;

    if  (request.session.user) {

    var user = await database.collection("users").findOne({
    "_id": ObjectId(request.session.user._id)
    });
    var  uploadedObj = {
        "_id":ObjectId(),
        "type": "folder",
        "folderName":name,
        "files": [],
        "folderPath": "",
        "createdAt": new Date().getTime()
    };
    var folderPath = "";
    var updatedArray = [];
    if (_id == ""){
        folderPath = "public/uploads/" + user.email + "/" + name;
        uploadedObj.folderPath = folderPath;
        if (!fileSystem.existsSync("public/uploads/" + user.email)) {
            fileSystem.mkdirSync("public/uploads/" + user.email)
        }
    } else {
        var folderObj = await recursiveGetFolder(user.uploaded, _id);
        uploadedObj.folderPath = folderObj.folderPath + "/" + name;
        updatedArray = await getUpdatedArray(user.uploaded,_id, uploadedObj);
    }
    if (uploadedObj.folderPath == ""){
        request.session.status = "error";
        request.session.message = "Folder name must not be empty.";
        result.redirect("/MyUploads");
        return false;
    }
    if (fileSystem.existsSync(uploadedObj.folderPath)){
        request.session.status = "error";
        request.session.message = "Folder with same name already exists";
        result.redirect("/MyUploads");
        return false;
    }
    fileSystem.mkdirSync(uploadedObj.folderPath);
    if (_id == ""){
        await database.collection("users").updateOne({
            "_id": ObjectId(request.session.user._id)
        },{
            $push:{
                "uploaded": uploadedObj
            }
        });

    } else {
        for (var a = 0; a < updatedArray.length; a++){
            updatedArray[a]._id = ObjectId(updatedArray[a]._id);
        }
        await database.collection("users").updateOne({
            "_id": ObjectId(request.session.user._id)
        },{
            $set:{
                "uploaded": updatedArray
            }
        });
        }
        result.redirect("/MyUploads/" + _id);
        return false;
    }
    result.redirect("/Login")
};

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

function getUpdatedArray (arr, _id, uploadedObj) {
    for (var a = 0; a < arr.length; a++) {
        // push in files array if type is folder and ID is found
        if (arr[a].type == "folder") {
            if (arr[a]._id == _id) {
                arr[a].files.push(uploadedObj);
                arr[a]._id = ObjectId(arr[a]._id);
            }

            // if it has files, then do the recursion
            if (arr[a].files.length > 0) {
                arr[a]._id = ObjectId(arr[a]._id);
                getUpdatedArray(arr[a].files, _id, uploadedObj);
            }
        }
    }

    return arr;
}

module.exports = {
    CreateFolder
};

    