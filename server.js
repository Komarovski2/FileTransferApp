// using express JS
var express = require("express");
var app = express();

require('dotenv').config();


var formidable = require("express-formidable");
app.use(formidable());

// to encrypt/decrypt passwords
var bcrypt = require("bcrypt");
var nodemailer = require('nodemailer')

const googleUser = process.env.GOOGLE_USER;
const googleKey = process.env.GOOGLE_KEY;

var nodemailerFrom = googleUser;
var nodemailerobject ={
    service: "gmail",
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        user: googleUser,
        pass: googleKey
    }
};


// use mongo DB as database
var mongodb = require("mongodb");
var mongoClient = mongodb.MongoClient;

// the unique ID for each mongo DB document
var ObjectId = mongodb.ObjectId;

// receiving http requests
var httpObj = require("http");
var http = httpObj.createServer(app);

// to store files
var fileSystem = require("fs");

const rimraf = require('rimraf');

// to start the session
var session = require("express-session");
app.use(session({
    secret: 'secret key',
    resave: false,
    saveUninitialized: false
}));

// define the publically accessible folders

app.use(express.static(__dirname + '/public', { 
    setHeaders: function(res, path) {
      if (path.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css');
      }
    }
  }));
  
app.use("/public/css", express.static(__dirname + "/public/css"));
app.use("/public/js", express.static(__dirname + "/public/js"));
app.use("/public/img", express.static(__dirname + "/public/img"));
app.use("/public/font-awesome-4.7.0", express.static(__dirname + "/public/font-awesome-4.7.0"));
app.use("/public/fonts", express.static(__dirname + "/public/fonts"));

// using EJS as templating engine
app.set("view engine", "ejs");

// main URL of website
var mainURL = "http://localhost:3000";

// global database object
var database = null;

// app middleware to attach main URL and user object with each request
app.use(function (request, result, next) {
    request.mainURL = mainURL;
    request.isLogin = (typeof request.session.user !== "undefined");
    request.user = request.session.user;

    // continue the request
    next();
});

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

function removeFolderReturnUpdated (arr, _id){
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

// function to add new uploaded object and return the updated array
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

// recursive function to remove the file and return the updated array
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

// recursive function to search uploaded files
function recursiveSearch (files, query) {
    var singleFile = null;

    for (var a = 0; a < files.length; a++) {
        const file = files[a];

        if (file.type == "folder") {
            // search folder case-insensitive
            if (file.folderName.toLowerCase().search(query.toLowerCase()) > -1) {
                return file;
            }

            if (file.files.length > 0) {
                singleFile = recursiveSearch(file.files, query);
                if (singleFile != null) {
                    // need parent folder in case of files
                    if (singleFile.type != "folder") {
                        singleFile.parent = file;
                    }
                    return singleFile;
                }
            }
        } else {
            if (file.name.toLowerCase().search(query.toLowerCase()) > -1) {
                return file;
            }
        }
    }
}

// recursive function to search shared files
function recursiveSearchShared (files, query) {
    var singleFile = null;

    for (var a = 0; a < files.length; a++) {
        var file = (typeof files[a].file === "undefined") ? files[a] : files[a].file;

        if (file.type == "folder") {
            if (file.folderName.toLowerCase().search(query.toLowerCase()) > -1) {
                return file;
            }

            if (file.files.length > 0) {
                singleFile = recursiveSearchShared(file.files, query);
                if (singleFile != null) {
                    if (singleFile.type != "folder") {
                        singleFile.parent = file;
                    }
                    return singleFile;
                }
            }
        } else {
            if (file.name.toLowerCase().search(query.toLowerCase()) > -1) {
                return file;
            }
        }
    }
}

        function recursiveGetSharedFile (files, _id){
            var singleFile = null;

            for (var a = 0; a <files.length; a++){
                var file = (typeof files[a].file === "undefined") ? files[a]:files[a].file;

                if (file.type != "folder") {
                    if (file._id == _id){
                        return file;
                    }
                }
                if (file.type == "folder" && file.files.length > 0){
                    singleFile = recursiveGetSharedFile(file.files,_id)

                    if(singleFile != null){
                        return singleFile;
                    }
                }
            }
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

        function updateMovedToFolderParent_ReturnUpdated(arr, _id, moveFolder){
            for (var a = 0; a < arr.length; a++){
                if (arr[a].type == "folder"){
                    if (arr[a]._id == _id){

                        moveFolder.folderPath = arr[a].folderPath + "/" +
                        moveFolder.folderName;
                        arr[a].files.push(moveFolder);
                        break;
                    }
                    if( arr[a].files.length > 0){
                        arr[a]._id = ObjectId(arr[a]._id);
                        updateMovedToFolderParent_ReturnUpdated(
                            arr[a].files, _id, moveFolder);
                    }
                }
            }
            return arr;
        }

        function moveFolderReturnUpdated (arr, _id, moveFolder, moveToFolder){
            for (var a = 0; a < arr.length; a++ ){
                if (arr[a].type == "folder"){
                    if (arr[a]._id == _id){

                        const newPath = moveToFolder.folderPath + "/" + arr[a].folderName;
                        fileSystem.rename(arr[a].folderPath, newPath, function (){
                            console.log("Folder has been moved.")
                        });

                        arr.splice(a, 1)
                        break;
                    }

                    if (arr[a].files.length > 0){
                        arr[a]._id = ObjectId(arr[a]._id);
                        moveFolderReturnUpdated(arr[a].files, _id, moveFolder, moveToFolder)
                    }
                }
            }
            return arr;
        }

        function recursiveGetAllFolders(files, _id){
            var folders = [];
            
            for (var a = 0; a < files.length; a++){
                const file = files[a];

                if(file.type == "folder"){

                    if (file._id != _id){
                        folders.push(file);
                        if(file.files.length > 0){
                            var tempFolders = recursiveGetAllFolders(file.files, _id);

                            for (var b = 0; b < tempFolders.length; b++){
                                folders.push(tempFolders[b]);
                            }
                        }
                    }
                }
            }
            return folders;
        }


// start the http server
http.listen(3000, function () {
    console.log("Server started at " + mainURL);

    // connect with mongo DB server
    mongoClient.connect("mongodb://localhost:27017", {
        useUnifiedTopology: true
    }, function (error, client) {

        // connect database (it will automatically create the database if not exists)
        database = client.db("file_transfer");
        console.log("Database connected.");

        

        app.post("/GetAllFolders", async function (request, result) {
            const _id = request.fields._id;
            const type = request.fields.type;

            if(request.session.user){
                var user = await database.collection("users").findOne({
                    "_id": ObjectId(request.session.user._id)
                });

                var tempAllFolders = recursiveGetAllFolders(user.uploaded, _id);
                var folders = [];
                for (var a = 0; a < tempAllFolders.length; a++){
                    folders.push({
                        "_id": tempAllFolders[a]._id,
                        "folderName":tempAllFolders[a].folderName
                    });
                }
                result.json({
                    "status": "success",
                    "message":"Record has been fetched.",
                    "folders":folders
                });
                return false;
            }

            result.json({
                "status":"error",
                "message":"Please login to perform this action."
            });
        });

        app.post("/MoveFile", async function (request, result) {
            const _id = request.fields._id;
            const type = request.fields.type;
            const folder = request.fields.folder

            if(request.session.user){

                var user = await database.collection("users").findOne({
                    "_id": ObjectId(request.session.user._id)
                });

                var updatedArray = user.uploaded;

                if( type == "folder"){

                    var moveFolder = await recursiveGetFolder(user.uploaded, _id)
                    var moveToFolder = await recursiveGetFolder(user.uploaded, folder);

                    updatedArray = await moveFolderReturnUpdated(user.uploaded,
                        _id, moveFolder, moveToFolder);

                    updatedArray = await updateMovedToFolderParent_ReturnUpdated(
                            updatedArray, folder, moveFolder);
                }
                await database.collection("users").updateOne({
                    "_id": ObjectId(request.session.user._id)
                }, {
                    $set: {
                        "uploaded":updatedArray
                    }
                });
                const backURL = request.header('Referer') || '/';
                result.redirect(backURL);
                return false;
            }
            result.redirect("/Login");
        });


        app.post("/RenameFile", async function (request,result) {
            const _id = request.fields._id;
            const name = request.fields.name;

            if(request.session.user){
                var user = await database.collection("users").findOne({
                    "_id": ObjectId(request.session.user._id)
                });

                var updatedArray = await renameFileReturnUpdated(user.uploaded, _id, name);
                for ( var a = 0; a < updatedArray.length; a++){
                    updatedArray[a]._id = ObjectId(updatedArray[a]._id);
                }

                await database.collection("users").updateOne({
                    "_id":ObjectId(request.session.user._id)
                }, {
                    $set:{
                        "uploaded": updatedArray
                    }
                });
                const backURL = request.header('Referer') || '/';
                result.redirect(backURL);
                return false;
            }
            result.redirect("/Login")
        });

        app.post("/RenameFolder", async function (request,result) {
            const _id = request.fields._id;
            const name = request.fields.name;

            if(request.session.user){
                var user = await database.collection("users").findOne({
                    "_id": ObjectId(request.session.user._id)
                });

                var updatedArray = await renameFolderReturnUpdated(user.uploaded, _id, name);
                for ( var a = 0; a < updatedArray.length; a++){
                    updatedArray[a]._id = ObjectId(updatedArray[a]._id);
                }

                await database.collection("users").updateOne({
                    "_id":ObjectId(request.session.user._id)
                }, {
                    $set:{
                        "uploaded": updatedArray
                    }
                });
                const backURL = request.header('Referer') || '/';
                result.redirect(backURL);
                return false;
            }
            result.redirect("/Login")
        });


        app.post("/DeleteSharedFile", async function (request, result){
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
        });

        app.post("/DeleteSharedDirectory", async function (request, result){
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
        });

        app.get("/SharedWithMe/:_id?", async function (request, result){
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
     });


        //remove shared access
        app.post("/RemoveSharedAccess", async function (request, result){
            const _id = request.fields._id;

            if (request.session.user) {
                const user = await database.collection("users").findOne({
                    $and: [{
                        "sharedWithMe._id": ObjectId(_id)
                    }, {
                        "sharedWithMe.sharedBy._id":ObjectId(request.session.user._id)
                    }]
                });

                //remove from array
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
        });

        app.post ("/GetFileSharedWith", async function (request, result){
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
    });

        app.post("/Share", async function (request, result){

            const _id = request.fields._id;
            const type = request.fields.type;
            const email = request.fields.email;

            if(request.session.user){
                var user = await database.collection("users").findOne({
                    "email":email
                });

                if (user == null){
                    request.session.status = "error";
                    request.session.message = "User" + email + "does not exists";
                    result.redirect("/MyUploads")

                    return false
                }

                if (!user.isVerified){
                    request.session.status = "error";
                    request.session.message = "User" + user.name + "account is not verified.";
                    result.redirect("/MyUploads")

                    return false;
                }

                var me = await database.collection("users").findOne({
                    "_id": ObjectId(request.session.user._id)
                });
                
                var file = null;
                if(type == "folder"){
                    file = await recursiveGetFolder(me.uploaded, _id);
                } else {
                    file = await recursiveGetFile(me.uploaded, _id)
                }
                    
                if (file == null){
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
                $push:{
                    "sharedWithMe":{
                        "_id":ObjectId(),
                        "file":file,
                        "sharedBy":{
                            "_id": ObjectId(sharedBy._id),
                            "name":sharedBy.name,
                            "email":sharedBy.email
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
        //Якщо це не убрати видає warning, пока не провірено чи не мішає result.redirect("/Login");
    });

        app.post("/GetUser", async function (request, result){
            const email = request.fields.email;

            if(request.session.user){
                var user = await database.collection("users").findOne({
                    "email": email
                });

                if (user == null){
                    result.json({
                        "status": "error",
                        "message": "User" + email + "does not exists"
                    });
                    return false;
                }

                if (!user.isVerified){
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
                "status":"error",
                "message": "Please login to perform this action"
            });
            return false;
        });


        // search files or folders
        app.get("/Search", async function (request, result) {
            const search = request.query.search;

            if (request.session.user) {
                var user = await database.collection("users").findOne({
                    "_id": ObjectId(request.session.user._id)
                });
                var fileUploaded = await recursiveSearch(user.uploaded, search);
                var fileShared = await recursiveSearchShared(user.sharedWithMe, search);

                // check if file is uploaded or shared with user
                if (fileUploaded == null && fileShared == null) {
                    request.status = "error";
                    request.message = "File/folder '" + search + "' is neither uploaded nor shared with you.";

                    result.render("Search", {
                        "request": request
                    });
                    return false;
                }

                var file = (fileUploaded == null) ? fileShared : fileUploaded;
                file.isShared = (fileUploaded == null);
                result.render("Search", {
                    "request": request,
                    "file": file
                });

                return false;
            }

            result.redirect("/Login");
        });


        // get all files shared with logged-in user
        app.get("/SharedWithMe/:_id?", async function (request, result) {
            result.render("SharedWithMe", {
                "request": request
            });
        });

        app.post("/DeleteLink", async function (request, result) {

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
                    request.session.message = "Link does not exists.";

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
        });

        app.get("/MySharedLinks", async function (request, result) {
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
        });

        app.get("/SharedViaLink/:hash", async function (request, result) {
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
        });

        app.post("/ShareViaLink", async function (request, result) {
            const _id = request.fields._id;

            if (request.session.user) {
                var user = await database.collection("users").findOne({
                    "_id": ObjectId(request.session.user._id)
                });

                var file = await recursiveGetFile(user.uploaded, _id);
                var folder = await recursiveGetFolder(user.uploaded, _id);

                if (file == null && folder == null) {
                    request.session.status = "error";
                    request.session.message = "File does not exists";

                    const backURL = request.header("Referer") || "/";
                    result.redirect(backURL);
                    return false;
                }

                if (folder != null){
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
        });
      
        // download file
        app.post("/DownloadFile", async function (request, result) {
            const _id = request.fields._id;

            if (request.session.user) {

                var user = await database.collection("users").findOne({
                    "_id": ObjectId(request.session.user._id)
                });

                var fileUploaded = await recursiveGetFile(user.uploaded, _id);
                var fileShared = await recursiveGetSharedFile(user.sharedWithMe,_id)
                
                if (fileUploaded == null && fileShared == null) {
                    result.json({
                        "status": "error",
                        "message": "File is neither uploaded nor shared with you."
                    });
                    return false;
                }

                var file = (fileUploaded == null) ? fileShared: fileUploaded;

                fileSystem.readFile(file.filePath, function (error, data) {
                    // console.log(error);

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
        });

        app.post("/DeleteDirectory", async function (request, result) {

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
        });

        app.post("/DeleteFile", async function (request, result) {
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
        });
        

        app.post("/UploadFile", async function (request, result) {
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
        });

        app.post("/CreateFolder", async function (request, result) {

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
    })


        app.get("/MyUploads/:_id?", async function (request, result) {
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
        });

        // view all files uploaded by logged-in user
        app.get("/MyUploads", async function (request, result) {
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
        });


       
        const { registrationLogic} = require('./public/js/controller/Register');

        const verifyEmail = require("./public/js/controller/VerifyEmail");
            app.get("/verifyEmail/:email/:verification_token", (request, result) =>
            verifyEmail(app, database, request, result)
        );

        const LoginLogic = require('./public/js/controller/Login');

        const { forgotPasswordLogic } = require('./public/js/controller/ForgotPassword');
        forgotPasswordLogic(app, database);



        app.get("/Logout", function (request, result) {
            request.session.destroy();
            result.redirect("/");
        });

        // show page to login
        app.get("/Login", function (request, result) {
            LoginLogic(app, database, request, result)
            result.render("Login", {
                "request": request
            });
        });

        
        

        app.get('/Register', function (request, result) {
            registrationLogic(app, database, request, result); 
            result.render("Register", {
                "request": request
             });
          });

          
        // home page
        app.get("/", function (request, result) {
            result.render("index", {
                "request": request
            });
        });


});
});
