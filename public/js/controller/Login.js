const bcrypt = require('bcrypt');

// Login.js
function LoginLogic(app, database, request, result) {    // Логіка авторизації
    app.post("/Login", async function (request, result) {
        var email = request.fields.email;
        var password = request.fields.password;

        var user = await database.collection("users").findOne({
            "email": email
        });

        if (user == null) {
            request.status = "error";
            request.message = "Email does not exist.";
            result.render("Login", {
                "request": request
            });
            
            return false;
        }

        bcrypt.compare(password, user.password, function (error, isVerify) {
            if (isVerify) {
                if (user.isVerified){
                request.session.user = user;
                result.redirect("/");

                return false;
            }
            request.status = "error";
            request.message = "Kindly verify your email.";
            result.render("Login", {
                "request": request
            });
            return false;
            
            }

            request.status = "error";
            request.message = "Password is not correct.";
            result.render("Login", {
                "request": request
            });
        });
    });
}

module.exports = LoginLogic;