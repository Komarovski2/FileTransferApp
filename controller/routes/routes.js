
const express = require('express');
const router = express.Router();

const { searchLogic } = require("./public/js/controller/Search");
const RenameObject = require("./public/js/controller/InteractionObject/RenameObject");
const { moveFile, getAllFolders } = require("./public/js/controller/MoveObject");
const DeleteObject = require("./public/js/controller/DeleteObject");
const ShareViaLink = require("./public/js/controller/ShareViaLink");
const DownloadFile = require("./public/js/controller/DownloadFile");
const ShareFilesViaEmail = require('./public/js/controller/ShareFiles/ShareFilesViaEmail');
const DisplayListOfAllUsers = require('./public/js/controller/DisplayListOfAllUsers');
const SharedWithMeAndDelete = require('./public/js/controller/SharedWithMeAndDelete');
const CreatedFolder = require('./public/js/controller/CreatedFolder');
const UploadFiles = require('./public/js/controller/UploadFiles');
const verifyEmail = require("./public/js/controller/VerifyEmail");
const LoginLogic = require('./public/js/controller/Login');
const { forgotPasswordLogic } = require('./public/js/controller/ForgotPassword');

module.exports = function (app, database) {
  //Search file/folders
  searchLogic(app, database);

  //Rename files and Folders/SubFolders
  app.post("/RenameFile", async function (request, result) {
    RenameObject.renameFile(database, request, result);
  });

  app.post("/RenameFolder", async function (request, result) {
    RenameObject.renameFolder(database, request, result);
  });

  //MoveObject - переміщення папок в інші папки
  app.post("/MoveFile", async function (request, result) {
    await moveFile(database, request, result);
  });

  app.post("/GetAllFolders", async function (request, result) {
    await getAllFolders(database, request, result);
  });

  // DeleteObject - видалення файлів та папок
  app.post("/DeleteFile", async function (request, result) {
    await DeleteObject.deleteFile(database, request, result);
  });

  app.post("/DeleteDirectory", async function (request, result) {
    await DeleteObject.deleteFolder(database, request, result);
  });

  // ShareViaLink - створення публічних ссилок і їх видалення.
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
  app.post("/DownloadFile", async function (request, result) {
    await DownloadFile.downloadFile(database, request, result);
  });

  // DisplayListOfAllUsers - Показ кому зашерив і видалення тому кому зашерив
  app.post("/GetUser", async function (request, result) {
    await ShareFilesViaEmail.GetUser(database, request, result);
  });

  app.post("/Share", async function (request, result) {
    await ShareFilesViaEmail.Share(database, request, result);
  });

  // DisplayListOfAllUsers - Показ кому зашерив і видалення тому кому зашерив
  app.post("/GetFileSharedWith", async function (request, result) {
    await DisplayListOfAllUsers.GetFileSharedWith(database, request, result);
  });

  app.post("/RemoveSharedAccess", async function (request, result) {
    await DisplayListOfAllUsers.RemoveSharedAccess(database, request, result);
  });

  // SharedWithMeAndDelete - показ файлів SharedWithMe/:_id та видалення папок/файлів
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
  app.post("/CreateFolder", async function (request, result) {
    await CreatedFolder.CreateFolder(database, request, result);
  });

  // CreatedFolder - загрузка файлів та їх відображення
  app.post("/UploadFile", async function (request, result) {
    UploadFiles.handleUploadFile(request, result, database);
  });

  app.get("/MyUploads/:_id?", async function (request, result) {
    UploadFiles.handleMyUploadsById(request, result, database);
  });

  app.get("/MyUploads", async function (request, result) {
    UploadFiles.handleMyUploads(request, result, database);
  });

  //Логіка верифікації аккаунтів
  app.get("/verifyEmail/:email/:verification_token", (request, result) =>
    verifyEmail(app, database, request, result)
  );

  //Логіка аутентифікації
  app.get("/Login", function (request, result) {
    LoginLogic(app, database, request, result);
    result.render("Login", {
      "request": request
    });
  });

  //ForgotPassword - логіка відновлення пароля
  forgotPasswordLogic(app, database);


  return router;
};
