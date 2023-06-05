// using express JS
var express = require("express");
var app = express();

require('dotenv').config();

var formidable = require("express-formidable");
app.use(formidable());

// to encrypt/decrypt passwords
var bcrypt = require("bcrypt");

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

        //Search file/folders
        const { searchLogic } = require("./public/js/controller/Search");
        searchLogic(app, database);

        //Rename files and Folders/SubFolders
        const RenameObject = require("./public/js/controller/RenameObject"); 

        app.post("/RenameFile", async function (request, result) {
            RenameObject.renameFile(database, request, result); 
        });

        app.post("/RenameFolder", async function (request, result) {
            RenameObject.renameFolder(database, request, result); 
        });

        //MoveObject - переміщення папок в інші папки
        const { moveFile, getAllFolders } = require("./public/js/controller/MoveObject");

        app.post("/MoveFile", async function (request, result) {
            await moveFile(database, request, result);
        });
        
        app.post("/GetAllFolders", async function (request, result) {
            await getAllFolders(database, request, result);
        });
        
        // DeleteObject - видалення файлів та папок
        const DeleteObject = require("./public/js/controller/DeleteObject");

        app.post("/DeleteFile", async function (request, result) {
            await DeleteObject.deleteFile(database, request, result);
        });

        app.post("/DeleteDirectory", async function (request, result) {
            await DeleteObject.deleteFolder(database, request, result);
        });

        // ShareViaLink - створення публічних ссилок і їх видалення.
        const ShareViaLink = require("./public/js/controller/ShareViaLink");

        app.post("/ShareViaLink", async function (request, result) {
            await ShareViaLink.shareViaLink(database, request, result);
        });

        app.get("/SharedViaLink/:hash", async function (request, result) {
            await ShareViaLink.getSharedLink(database, request, result);
        });

        app.get("/MySharedLinks", async function (request, result) {
            await ShareViaLink.getMySharedLinks(database, request, result);
        });

        app.post("/DeleteLink", async function (request, result) {
            await ShareViaLink.deleteLink(database, request, result);
        });

        // DownloadFile - скачування файлів
        const DownloadFile = require("./public/js/controller/DownloadFile");

        app.post("/DownloadFile", async function (request, result) {
             await DownloadFile.downloadFile(database, request, result);
        });

        // DisplayListOfAllUsers - Показ кому зашерив і видалення тому кому зашерив
        const ShareFilesViaEmail = require('./public/js/controller/ShareFilesViaEmail');

        app.post("/GetUser", async function (request, result) {
            await ShareFilesViaEmail.GetUser(database, request, result);
       });

       app.post("/Share", async function (request, result) {
            await ShareFilesViaEmail.Share(database, request, result);
        });

        // DisplayListOfAllUsers - Показ кому зашерив і видалення тому кому зашерив
        const DisplayListOfAllUsers = require('./public/js/controller/DisplayListOfAllUsers');

        app.post("/GetFileSharedWith", async function (request, result) {
            await DisplayListOfAllUsers.GetFileSharedWith(database, request, result);
        });

        app.post("/RemoveSharedAccess", async function (request, result) {
            await DisplayListOfAllUsers.RemoveSharedAccess(database, request, result);
        });
        
        // SharedWithMeAndDelete - показ файлів SharedWithMe/:_id та видалення папок/файлів
        const SharedWithMeAndDelete = require('./public/js/controller/SharedWithMeAndDelete');

        app.get("/SharedWithMe/:_id?", async function (request, result) {
            await SharedWithMeAndDelete.SharedWithMe(database, request, result);
        });

        app.post("/DeleteSharedDirectory", async function (request, result) {
            await SharedWithMeAndDelete.DeleteSharedDirectory(database, request, result);
        });

        app.post("/DeleteSharedFile", async function (request, result) {
            await SharedWithMeAndDelete.DeleteSharedFile(database, request, result);
        });
        
        // CreatedFolder - створення папок

        const CreatedFolder = require('./public/js/controller/CreatedFolder');

        app.post("/CreateFolder", async function (request, result) {
            await CreatedFolder.CreateFolder(database, request, result);
        });



        const io = require("socket.io")(http)

        io.on("connection", function(socket){
            socket.on("sender-join", function(data){
                socket.join(data.uid);
            });
            socket.on("receiver-join", function(data){
                socket.join(data.uid);
                socket.in(data.sender_uid).emit("init",data.uid);
            });
            socket.on("file-meta", function(data){
                socket.in(data.uid).emit("fs-meta",data.metadata);
            });
            socket.on("fs-start", function(data){
                socket.in(data.uid).emit("fs-share",{});
            });
            socket.on("file-raw", function(data){
                socket.in(data.uid).emit("fs-share",data.buffer);
            });
        })

        const path = require('path');

        app.get('/download/:filename', (request, result) => {
            const filename = request.params.filename;
            const filePath = path.join(__dirname, 'public', 'uploads', 'komarovski22@gmail.com', filename); // Змініть шлях до відповідної папки з файлами
            result.download(filePath, (err) => {
              if (err) {
                console.log(err);
                result.status(404).send('Файл не знайдено');
              }
            });
          });

        app.get("/index1", function (request, result) {
            // if (request.session.user){
            result.render("index1", {
                "request": request
            });
        // }
        // result.redirect("/Login");
        });

        app.get("/receiver", function (request, result) {
            result.render("receiver", {
                "request": request
            });
        });

        
        // get all files shared with logged-in user
        app.get("/SharedWithMe/:_id?", async function (request, result) {
            result.render("SharedWithMe", {
                "request": request
            });
        });

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


       //Логіка регєстрації
        const { registrationLogic} = require('./public/js/controller/Register');

        //Логіка верифікації аккаунтів
        const verifyEmail = require("./public/js/controller/VerifyEmail");
            app.get("/verifyEmail/:email/:verification_token", (request, result) =>
            verifyEmail(app, database, request, result)
        );

        //Логіка аутентифікації
        const LoginLogic = require('./public/js/controller/Login');

        //ForgotPassword - логіка відновлення пароля
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
