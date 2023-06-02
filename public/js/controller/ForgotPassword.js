app.post("/SendRecoveryLink", async function (request,result){
    var email = request.fields.email;
    var user = await database.collection("users").findOne({
        "email":email
    });
    if (user == null){
        request.status = "error";
        request.message = "Email does not exists.";

        result.render("ForgotPassword", {
            "request": request
        });
        return false;
    }
    var reset_token = new Date().getTime();
    await database.collection("users").findOneAndUpdate({
        "email":email
    }, {
        $set:{
            "reset_token":reset_token
        }
    });

    var transporter  = nodemailer.createTransport(nodemailerobject);

    var text = "Please click the following link to reset your password: "
    + mainURL + "/ResetPassword/" + email + "/" + reset_token;

    var html = "Please click the following link to reset your password: <br><br> <a href ='"
    + mainURL + "/ResetPassword/" + email + "/" + reset_token + "'>ResetPassword </a> <br> <br> Thank you";

    transporter.sendMail({
        from:nodemailerFrom,
        to:email,
        subject:"Reset Password",
        text:text,
        html:html
    }, function(error, info){
        if(error){
            console.error(error);
        } else {
            console.log("Email sent: " + info.response);
        }
        
        request.status = "success";
        request.message = "Email has been sent with the link to recover the password.";

        result.render("ForgotPassword", {
            "request": request
        });
    });
});     

app.get("/ResetPassword/:email/:reset_token",async function(request,result){

    var email = request.params.email;
    var reset_token = request.params.reset_token;

    var user = await database.collection("users").findOne({
        $and:[{
            "email":email,
        },{
            "reset_token": parseInt(reset_token)
        }]
    });

    if (user == null){

        request.status = "error";
        request.message = "Link is expired.";
        result.render("Error",{
            "request": request
        });
        
        return false;
    }
    result.render("ResetPassword",{
        "request": request,
        "email": email,
        "reset_token": reset_token
    });
});

app.post("/ResetPassword", async function (request, result) {
    var email = request.fields.email;
    var reset_token = request.fields.reset_token;
    var new_password = request.fields.new_password;
    var confirm_password = request.fields.confirm_password;

    if (new_password != confirm_password){
        request.status = "error";
        request.message = "Password does not match.";
        
        result.render ("ResetPassword",{
            "request":request,
            "email":email,
            "reset_token": reset_token
        });
        return false;
    }
    var user = await database.collection("users").findOne({
        $and: [{
            "email":email,
        },{
            "reset_token": parseInt(reset_token)
        }]
    });

    if (user == null){
        request.status = "error";
        request.message = "Email does not exist.Or recovery link is expired.";

        result.render("ResetPassword",{
            "request": request,
            "email": email,
            "reset_token": reset_token,
        });
        return false;
    } 

    bcrypt.hash(new_password, 10, async function (error, hash) {
        await database.collection("users").findOneAndUpdate({
            $and: [{
                "email":email,
            },{
                "reset_token":parseInt(reset_token)
            }]
        },{
            $set: {
                "reset_token":"",
                "password":hash
            }
        });

        request.status = "success";
        request.message = "Password has been changed. Please try login again";

        result.render("Login", {
            "request": request
        });
    });
});