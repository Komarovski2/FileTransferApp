// app.post("/Register", async function (request, result) {

//     var name = request.fields.name;
//     var email = request.fields.email;
//     var password = request.fields.password;
//     var reset_token = "";
//     var isVerified = true;
//     var verification_token = new Date().getTime();

//     var user = await database.collection("users").findOne({
//         "email": email
//     });

//     if (user == null) {
//         bcrypt.hash(password, 10, async function (error, hash) {
//             await database.collection("users").insertOne({
//                 "name": name,
//                 "email": email,
//                 "password": hash,
//                 "reset_token": reset_token,
//                 "uploaded": [],
//                 "sharedWithMe": [],
//                 "isVerified": isVerified,
//                 "verification_token": verification_token
//             }, async function (error, data) {

//                 request.status = "success";
//                 request.message = "Signed up successfully. You can login now.";

//                 result.render("Register", {
//                     "request": request
//                 });
                
//             });
//         });
//     } else {
//         request.status = "error";
//         request.message = "Email already exist.";

//         result.render("Register", {
//             "request": request
//         });
//     }
// });

// // show page to do the registration
// app.get("/Register", function (request, result) {
//     result.render("Register", {
//         "request": request
//     });
// });