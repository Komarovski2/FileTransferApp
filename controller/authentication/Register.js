const bcrypt = require("bcrypt");
const { sendEmail } = require("./nodemailer");

var mainURL = "http://localhost:3000";

// register.js
function registrationLogic(app, database, request, result) {
  // Логіка реєстрації...
  app.post("/Register", async function (request, result) {
    var name = request.fields.name;
    var email = request.fields.email;
    var password = request.fields.password;
    var reset_token = "";
    var isVerified = false;
    var verification_token = new Date().getTime();

    var user = await database.collection("users").findOne({
      email: email,
    });

    if (user == null) {
      bcrypt.hash(password, 10, async function (error, hash) {
        await database.collection("users").insertOne(
          {
            name: name,
            email: email,
            password: hash,
            reset_token: reset_token,
            uploaded: [],
            sharedWithMe: [],
            isVerified: isVerified,
            verification_token: verification_token,
          },
          async function (error, data) {
            var text =
              "Please verify your account by click the following link: " +
              mainURL +
              "/verifyEmail/" +
              email +
              "/" +
              verification_token;

            var html =
              "Please verify your account by click the following link: <br><br> <a href='" +
              mainURL +
              "/verifyEmail/" +
              email +
              "/" +
              verification_token +
              "'> Confirm Email </a> <br><br> Thank you.";

            try {
              await sendEmail(email, "Email Verification", text, html);
              request.status = "success";
              request.message =
                "Signed up successfully. An email has been sent to verify your account. Once verified, you will be able to login and start using app";
            } catch (error) {
              console.error(error);
              request.status = "error";
              request.message =
                "An error occurred while sending the verification email.";
            }

            result.render("Register", {
              request: request,
            });
          }
        );
      });
    } else {
      request.status = "error";
      request.message = "Email already exist.";

      result.render("Register", {
        request: request,
      });
    }
  });
}



module.exports = {
  registrationLogic: registrationLogic,
};
