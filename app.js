const express = require("express");
const exphbs = require("express-handlebars");
const Handlebars = require("handlebars");
const {
  allowInsecurePrototypeAccess,
} = require("@handlebars/allow-prototype-access");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const passport = require("passport");
const bcrypt = require("bcryptjs");

//init app

const app = express();
//setup body parser middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

//configuration for authentication

app.use(cookieParser());
app.use(
  session({
    secret: "GMC",
    resave: true,
    saveUninitialized: true,
  })
);

app.use(passport.initialize());
app.use(passport.session());
//load passports

require("./passport/local");

//load files
const keys = require("./config/keys");
//load collection
const User = require("./models/user");
const Contact = require("./models/contact");
//connect to mongoDB

mongoose
  .connect(keys.MongoDB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
  })
  .then(() => console.log("MongoDB is connected.."))
  .catch((err) => console.log(err));

//setup view engine

app.engine(
  "handlebars",
  exphbs({
    defaultLayout: "main",
    handlebars: allowInsecurePrototypeAccess(Handlebars),
  })
);

app.set("view engine", "handlebars");
//connect client side to serve css and js files
app.use(express.static("public"));
// create port
const port = process.env.PORT || 3000;

//handle home route
app.get("/", (req, res) => {
  res.render("home");
});

app.get("/about", (req, res) => {
  res.render("about", {
    title: "About",
  });
});

app.get("/contact", (req, res) => {
  res.render("contact", {
    title: "Conatact us",
  });
});

//save contact form data
app.post("/contact", (req, res) => {
  console.log(req.body);
  const newContact = {
    name: req.user._id,
    message: req.body.message,
  };
  new Contact(newContact).save((err, user) => {
    if (err) {
      throw err;
    } else {
      console.log("We received message from user", user);
    }
  });
});

app.get("/signup", (req, res) => {
  res.render("signupForm", {
    title: "Register",
  });
});

app.post("/signup", (req, res) => {
  console.log(req.body);
  let errors = [];
  if (req.body.password !== req.body.password2) {
    errors.push({ text: "Passoword does not match" });
  }
  if (req.body.password.length < 5) {
    errors.push({ text: "Password must be atleast 5 characters" });
  }
  if (errors.length > 0) {
    res.render("signupForm", {
      errors: errors,
      firstname: req.body.firstname,
      lastname: req.body.lastname,
      password: req.body.password,
      password2: req.body.password2,
      email: req.body.email,
    });
  } else {
    User.findOne({ email: req.body.email }).then((user) => {
      if (user) {
        let errors = [];
        errors.push({ text: "Email already exists!!" });
        res.render("signupForm", {
          errors: errors,
          firstname: req.body.firstname,
          lastname: req.body.lastname,
          password: req.body.password,
          password2: req.body.password2,
          email: req.body.email,
        });
      } else {
        //encrypt passowrd
        let salt = bcrypt.genSaltSync(10);
        let hash = bcrypt.hashSync(req.body.password, salt);

        const newUser = {
          firstname: req.body.firstname,
          lastname: req.body.lastname,
          email: req.body.email,
          password: hash,
        };
        new User(newUser).save((err, user) => {
          if (err) {
            throw err;
          }
          if (user) {
            let success = [];
            success.push({
              text: "You successfully created an account! You can login now",
            });
            res.render("loginForm", {
              success: success,
            });
          }
        });
      }
    });
  }
});

app.get("/displayLoginForm", (req, res) => {
  res.render("loginForm");
});

app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/profile",
    failureRedirect: "/loginErrors",
  })
);

//display profile
app.get("/profile", (req, res) => {
  User.findById({ _id: req.user._id }).then((user) => {
    res.render("profile", {
      user: user,
    });
  });
});

app.get("/loginErrors", (req, res) => {
  let errors = [];
  errors.push({ text: "User Not found or Password Incorrect" });
  res.render("loginForm", {
    errors: errors,
  });
});

app.listen(port, () => {
  console.log(`server is running on port ${port}`);
});
