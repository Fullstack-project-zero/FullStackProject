const router = require("express").Router();
const bcryptjs = require('bcryptjs');
const saltRounds = 10;
const mongoose = require('mongoose');
const User = require("../models/User.model");
const { isLoggedIn, isLoggedOut } = require('../middleware/route-guard.js');

const fileUploader = require('../config/cloudinary.config');

// SIGN UP ROUTES ------------------------------------------
router.get("/signup", isLoggedOut, (req, res) => {
    res.render("auth/signup");
});

router.get("/user-profile", (req, res) => {
    res.render('users/user-profile', { userInSession: req.session.currentUser });
});

router.post("/signup", fileUploader.single("profile-img"), (req, res, next) => {

    const { username, email, password, country } = req.body;

    if (!req.file?.path) {
        res.render("auth/signup", { errorMessage: 'All fields are mandatory. Please provide an image' });
        return
    }

    const regex = /(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,}/;
    if (!regex.test(password)) {
        res
            .status(400)
            .render("auth/signup", {
                errorMessage: "Password needs to have at least 6 chars and must contain at least one number, one lowercase and one uppercase letter."
            });
        return;
    }

    bcryptjs
        .genSalt(saltRounds)
        .then((salt) => bcryptjs.hash(password, salt))
        .then((hashedPassword) => {
            return User.create({
                username,
                email,
                password: hashedPassword,
                country,
                img: req.file?.path
            })
        })
        .then(createdUser => {
            res.render("users/user-profile", { createdUser });
        })
        .catch((error) => {
            if (error instanceof mongoose.Error.ValidationError) {
                res.status(500).render("auth/signup", { errorMessage: error.message });
            } else if (error.code === 11000) {
                res.status(500).render("auth/signup", {
                    errorMessage: "Username and email need to be unique. Provide a valid username or email.",
                });
            } else {
                next(error);
            }
        });
});



//LOG IN ROUTES ------------------------------------------
router.get("/login", isLoggedOut, (req, res) => {
    res.render("auth/login");
});

router.post("/login", (req, res, next) => {
    const { username, password } = req.body;

    console.log("SESSION =====> ", req.session);

    if (username === "" || password === "") {
        res.render("auth/login", {
            errorMessage: "Please enter both email and password to login."
        });
        return;
    }

    User.findOne({ username })
        .then(user => {
            if (!user) {
                console.log("Username not registered.");
                res.render("auth/login", { errorMessage: "Incorrect user and/or password." });
                return;
            } else if (bcryptjs.compareSync(password, user.password)) {
                req.session.currentUser = user;
                // Remove the password field
                delete req.session.currentUser.password;
                res.redirect("/user-profile");
            } else {
                console.log("Incorrect password. ");
                res.render("auth/login", { errorMessage: "Incorrect user and/or password." });
            }
        })
        .catch(error => next(error));
});



// USER PROFILE ROUTES ------------------------------------------
router.get("/user-profile/edit", isLoggedIn, (req, res, next) => {
    const userId = req.session.currentUser?._id;

    User.findById(userId)
        .then((foundUser) => {
            res.render("users/user-edit", { foundUser })
        })
        .catch(error => {
            console.log("Error while retrieving user details.");
            next(error);
        })
})

router.post("/user-profile/edit", fileUploader.single("img"), (req, res, next) => {

    const userId = req.session.currentUser?._id;
    const { username, email, password, country, previousImg } = req.body;

    const regex = /(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,}/;
    if (!regex.test(password)) {
        res
            .status(400)
            .render("auth/signup", {
                errorMessage: "Password needs to have at least 6 chars and must contain at least one number, one lowercase and one uppercase letter."
            });
        return;
    }

    bcryptjs
        .genSalt(saltRounds)
        .then((salt) => bcryptjs.hash(password, salt))
        .then((hashedPassword) => {
            return User.findByIdAndUpdate(userId, { username, email, password: hashedPassword, country, img: req.file?.path || previousImg })
        })
        .then( (user) => {
            req.session.currentUser = user;
            res.redirect(`/user-profile`);
        })
        .catch((error) => {
            if (error instanceof mongoose.Error.ValidationError) {
                res.status(500).render("auth/signup", { errorMessage: error.message });
            } else if (error.code === 11000) {
                res.status(500).render("auth/signup", {
                    errorMessage: "Username and email need to be unique. Provide a valid username or email.",
                });
            } else {
                next(error);
            }
        });

});



// LOG OUT ROUTES ------------------------------------------
router.post('/logout', isLoggedIn, (req, res, next) => {
    req.session.destroy(err => {
        if (err) next(err);
        res.redirect('/');
    });
});


module.exports = router;