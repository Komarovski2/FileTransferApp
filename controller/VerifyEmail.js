const verifyEmail = async (app, database, request, result) => {
    const email = request.params.email;
    const verification_token = request.params.verification_token;
    const user = await database.collection("users").findOne({
        $and: [
            {
                "email": email,
            },
            {
                "verification_token": parseInt(verification_token),
            },
        ],
    });

    if (user === null) {
        request.status = "error";
        request.message = "Email does not exist or verification link has expired.";
        result.render("Login", {
            "request": request,
        });
    } else {
        await database.collection("users").findOneAndUpdate(
            {
                $and: [
                    {
                        "email": email,
                    },
                    {
                        "verification_token": parseInt(verification_token),
                    },
                ],
            },
            {
                $set: {
                    "verification_token": "",
                    "isVerified": true,
                },
            }
        );

        request.status = "success";
        request.message = "Account has been verified. Please try to log in.";
        result.render("Login", {
            "request": request,
        });
    }
};

module.exports = verifyEmail;
