// Search.js

function recursiveSearch(files, query) {
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
  
  function recursiveSearchShared(files, query) {
    var singleFile = null;
  
    for (var a = 0; a < files.length; a++) {
      var file = typeof files[a].file === "undefined" ? files[a] : files[a].file;
  
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
  
  function searchLogic(app, database) {
    app.get("/Search", async function (request, result) {
      const search = request.query.search;
  
      if (request.session.user) {
        var user = await database.collection("users").findOne({
          _id: ObjectId(request.session.user._id),
        });
        var fileUploaded = await recursiveSearch(user.uploaded, search);
        var fileShared = await recursiveSearchShared(user.sharedWithMe, search);
  
        // check if file is uploaded or shared with user
        if (fileUploaded == null && fileShared == null) {
          request.status = "error";
          request.message = "File/folder '" + search + "' is neither uploaded nor shared with you.";
  
          result.render("Search", {
            request: request,
          });
          return false;
        }
  
        var file = fileUploaded == null ? fileShared : fileUploaded;
        file.isShared = fileUploaded == null;
        result.render("Search", {
          request: request,
          file: file,
        });
  
        return false;
      }
  
      result.redirect("/Login");
    });
  }
  
  module.exports = {
    searchLogic: searchLogic,
  };
  