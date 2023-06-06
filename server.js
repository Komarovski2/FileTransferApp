// using express JS
var express = require("express");
var app = express();

require('dotenv').config();

var formidable = require("express-formidable");
app.use(formidable());

// use mongo DB as database
var mongodb = require("mongodb");
var mongoClient = mongodb.MongoClient;

// receiving http requests
var httpObj = require("http");
var http = httpObj.createServer(app);

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
        const { searchLogic } = require("./controller/Search");
        searchLogic(app, database);

        //Rename files and Folders/SubFolders
        const RenameObject = require("./controller/InteractionObject/RenameObject"); 

        app.post("/RenameFile", async function (request, result) {
            RenameObject.renameFile(database, request, result); 
        });

        app.post("/RenameFolder", async function (request, result) {
            RenameObject.renameFolder(database, request, result); 
        });

        //MoveObject - переміщення папок в інші папки
        const { moveFile, getAllFolders } = require("./controller/InteractionObject/MoveObject");

        app.post("/MoveFile", async function (request, result) {
            await moveFile(database, request, result);
        });
        
        app.post("/GetAllFolders", async function (request, result) {
            await getAllFolders(database, request, result);
        });
        
        // DeleteObject - видалення файлів та папок
        const DeleteObject = require("./controller/InteractionObject/DeleteObject");

        app.post("/DeleteFile", async function (request, result) {
            await DeleteObject.deleteFile(database, request, result);
        });

        app.post("/DeleteDirectory", async function (request, result) {
            await DeleteObject.deleteFolder(database, request, result);
        });

        // ShareViaLink - створення публічних ссилок і їх видалення.
        const ShareViaLink = require("./controller/ShareFiles/ShareViaLink");

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
        const DownloadFile = require("./controller/InteractionObject/DownloadFile");

        app.post("/DownloadFile", async function (request, result) {
             await DownloadFile.downloadFile(database, request, result);
        });

        // DisplayListOfAllUsers - Показ кому зашерив і видалення тому кому зашерив
        const ShareFilesViaEmail = require('./controller/ShareFiles/ShareFilesViaEmail');

        app.post("/GetUser", async function (request, result) {
            await ShareFilesViaEmail.GetUser(database, request, result);
       });

       app.post("/Share", async function (request, result) {
            await ShareFilesViaEmail.Share(database, request, result);
        });

        // DisplayListOfAllUsers - Показ кому зашерив і видалення тому кому зашерив
        const DisplayListOfAllUsers = require('./controller/ShareFiles/DisplayListOfAllUsers');

        app.post("/GetFileSharedWith", async function (request, result) {
            await DisplayListOfAllUsers.GetFileSharedWith(database, request, result);
        });

        app.post("/RemoveSharedAccess", async function (request, result) {
            await DisplayListOfAllUsers.RemoveSharedAccess(database, request, result);
        });
        
        // SharedWithMeAndDelete - показ файлів SharedWithMe/:_id та видалення папок/файлів
        const SharedWithMeAndDelete = require('./controller/ShareFiles/SharedWithMeAndDelete');

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

        const CreatedFolder = require('./controller/CreatedObject/CreatedFolder');

        app.post("/CreateFolder", async function (request, result) {
            await CreatedFolder.CreateFolder(database, request, result);
        });

        // CreatedFolder - загрузка файлів та їх відображення
        const UploadFiles = require('./controller/CreatedObject/UploadFiles');

        app.post("/UploadFile", async function (request, result) {
            UploadFiles.handleUploadFile(request, result, database);
          });

          app.get("/MyUploads/:_id?", async function (request, result) {
            UploadFiles.handleMyUploadsById(request, result, database);
          });

          app.get("/MyUploads", async function (request, result) {
            UploadFiles.handleMyUploads(request, result, database);
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

       //Логіка регєстрації
        const { registrationLogic} = require('./controller/authentication/Register');

        //Логіка верифікації аккаунтів
        const verifyEmail = require("./controller/authentication/VerifyEmail");
            app.get("/verifyEmail/:email/:verification_token", (request, result) =>
            verifyEmail(app, database, request, result)
        );

        //Логіка аутентифікації
        const LoginLogic = require('./controller/authentication/Login');

        //ForgotPassword - логіка відновлення пароля
        const { forgotPasswordLogic } = require('./controller/authentication/ForgotPassword');
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
