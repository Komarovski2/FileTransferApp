const fileSystem = require('fs');
const { ObjectId } = require('mongodb');
const UploadFiles = require('./public/js/controller/UploadFiles');


async function handleMyUploads(request, result, database) {
    if (request.session.user) {

        var user = await database.collection("users").findOne({
            "_id": ObjectId(request.session.user._id)
        });

        var uploaded = user.uploaded;

        result.render("MyUploads", {
            "request": request,
            "uploaded": uploaded
        });
        return false;
    }

    result.redirect("/Login");
};

async function handleUploadFile(request, result, database) {
    if (request.session.user) {

        var user = await database.collection("users").findOne({
            "_id": ObjectId(request.session.user._id)
        });
        
        if (request.files.file.size > 0) {

            const _id = request.fields._id;

            var uploadedObj = {
                "_id": ObjectId(),
                "size": request.files.file.size, // in bytes
                "name": request.files.file.name,
                "type": request.files.file.type,
                "filePath": "",
                "createdAt": new Date().getTime()
            };

            var filePath = "";

            if (_id == "") {

                filePath = "public/uploads/" + user.email + "/" + new Date().getTime() + "-" + request.files.file.name;
                uploadedObj.filePath = filePath;

                if (!fileSystem.existsSync("public/uploads/" + user.email)){
                    fileSystem.mkdirSync("public/uploads/" + user.email);
                }
      
            // Read the file
            fileSystem.readFile(request.files.file.path, function (err, data) {
                if (err) throw err;
                console.log('File read!');

                // Write the file
                fileSystem.writeFile(filePath, data, async function (err) {
                    if (err) throw err;
                    console.log('File written!');

                    await database.collection("users").updateOne({
                        "_id": ObjectId(request.session.user._id)
                    }, {
                        $push: {
                            "uploaded": uploadedObj
                        }
                    });

                    request.session.status = "success";
                    request.session.message = "Image has been uploaded.";

                    result.redirect("/MyUploads/" + _id);
                });

                // Delete the file
                fileSystem.unlink(request.files.file.path, function (err) {
                    if (err) throw err;
                    console.log('File deleted!');
                });
            });
            
        } else {
                //if it is a folder
            var folderObj = await recursiveGetFolder(user.uploaded, _id);

            uploadedObj.filePath = folderObj.folderPath + "/" + request.files.file.name;

            var updatedArray = await getUpdatedArray(user.uploaded, _id, uploadedObj);

             // Read the file
             fileSystem.readFile(request.files.file.path, function (err, data) {
                if (err) throw err;
                console.log('File read!');

                // Write the file
                fileSystem.writeFile(uploadedObj.filePath, data, async function (err) {
                    if (err) throw err;
                    console.log('File written!');

                    for (var a = 0; a < updatedArray.length; a++){
                        updatedArray[a]._id = ObjectId(updatedArray[a]._id)
                    }

                    await database.collection("users").updateOne({
                        "_id":ObjectId(request.session.user._id)
                    }, {
                        $set: {
                            "uploaded":updatedArray
                        }
                    });

                    result.redirect("/MyUploads/" + _id);
                });

                fileSystem.unlink(request.files.file.path, function (err) {
                    if (err) throw err;
                    console.log('File deleted!');
                });
            });
        }

    } else {
            request.status = "error";
            request.message = "Please select valid image.";

            result.render("MyUploads", {
                "request": request
            });
        }

        return false;
    }

    result.redirect("/Login");
};

async function handleMyUploadsById(request, result, database) {
    const _id = request.params._id;
    if(request.session.user){
        var user = await database.collection("users").findOne({
            "_id": ObjectId(request.session.user._id)
        });

        var uploaded = null;
        var folderName = "";
        var createdAt = "";
        if (typeof _id == "undefined"){
            uploaded = user.uploaded;
        } else {
            var folderObj = await recursiveGetFolder(user.uploaded, _id);
            if (folderObj == null){
                request.status = "error";
                request.message = "Folder not found.";
                result.render("MyUploads",{
                    "request":request,
                    "uploaded":uploaded,
                    "_id":_id,
                    "folderName":folderName,
                    "createdAt":createdAt
                });
                return false;
            }
            uploaded = folderObj.files;
            folderName = folderObj.folderName;
            createdAt = folderObj.createdAt;
        }
        if (uploaded == null){
            request.status = "error";
            request.message = "Directory not found.";
            result.render("MyUploads",{
                "request":request,
                "uploaded":uploaded,
                "_id":_id,
                "folderName":folderName,
                "createdAt":createdAt
            });
            return false;
        }
        result.render("MyUploads",{
            "request":request,
            "uploaded":uploaded,
            "_id":_id,
            "folderName":folderName,
            "createdAt":createdAt
        });
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
    handleMyUploads,
    handleUploadFile,
    handleMyUploadsById
  };