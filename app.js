const express = require("express");
const exphbs = require("express-handlebars");
const Handlebars = require("handlebars");
const {
  allowInsecurePrototypeAccess,
} = require("@handlebars/allow-prototype-access");

const mongoose = require("mongoose");
//const bodyParser = require("body-parser");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const passport = require("passport");
const bcrypt = require("bcryptjs");
const formidable = require("formidable");
const path = require("path");
const store = require("./middleware/multer");

//init app

const app = express();

//setup body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
//app.use(bodyParser.urlencoded({ extended: false }));
//app.use(bodyParser.json());

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

//load helpers
const { requireLogin, ensureGuest } = require("./helpers/authhelper");

//load passports
require("./passport/local");

//make user as a global object
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  next();
});

//load files
//const keys = require("./config/keys");
//load collection
const User = require("./models/user");
const Contact = require("./models/contact");

//connect to mongoDB
// try {
//   await mongoose.connect(keys.MongoDB, {
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
//     useCreateIndex: true,
//     useFindAndModify: false,
//   });
// } catch (error) {
//   handleError(error);
// }

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    const uri =
      // "mongodb+srv://LimoTours:48664842@limotours.jrmdy.mongodb.net/Limo?retryWrites=true&w=majority";

      await mongoose.connect(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useCreateIndex: true,
        useFindAndModify: false,
      });
    console.log("MongoDb connected");
  } catch (err) {
    console.log("Failed to connect to MongoDB", err);
  }
};

connectDB();

// mongoose
//   .connect(keys.MongoDB, {
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
//     useCreateIndex: true,
//     useFindAndModify: false,
//   })
//   .then(() => console.log("MongoDB is connected.."))
//   .catch((err) => console.log(err));

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
app.use(express.static(path.join(__dirname, "public")));

// create port
const port = process.env.PORT || 3000;

//handle home route
app.get("/", (req, res) => {
  res.render("home");
});

app.get("/about", ensureGuest, (req, res) => {
  res.render("about", {
    title: "About",
  });
});

app.get("/contact", requireLogin, (req, res) => {
  res.render("contact", {
    title: "Contact us",
  });
});

//save contact form data
app.post("/contact", requireLogin, (req, res) => {
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

app.get("/signup", ensureGuest, (req, res) => {
  res.render("signupForm", {
    title: "Register",
  });
});

app.post("/signup", ensureGuest, (req, res) => {
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

app.get("/displayLoginForm", ensureGuest, (req, res) => {
  res.render("loginForm", {
    title: "Login",
  });
});

app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/profile",
    failureRedirect: "/loginErrors",
  })
);

//display profile
app.get("/profile", requireLogin, (req, res) => {
  User.findById({ _id: req.user._id }).then((user) => {
    user.online = true;
    user.save((err, user) => {
      if (err) {
        throw err;
      }
      if (user) {
        res.render("profile", {
          user: user,
          title: "Profile",
        });
      }
    });
  });
});

app.get("/loginErrors", (req, res) => {
  let errors = [];
  errors.push({ text: "User Not found or Password Incorrect" });
  res.render("loginForm", {
    errors: errors,
    title: "Error",
  });
});

//list a car route
app.get("/listcar", requireLogin, (req, res) => {
  res.render("listcar", {
    title: "Listing",
  });
});

app.post("/listcar", requireLogin, (req, res) => {
  console.log(req.body);
  res.render("listcar2", {
    title: "Finish",
  });
});

//receive image
app.post("/uploadimage", (req, res) => {
  const form = new formidable.IncomingForm();
  form.on("file", (field, file) => {
    console.log(file);
  });
  form.on("error", (err) => {
    console.log(err);
  });
  form.on("end", () => {
    console.log("Image received successfully.. ");
  });
  form.parse(req);
});

//log user out
app.get("/logout", (req, res) => {
  User.findById({ _id: req.user._id }).then((user) => {
    user.online = false;
    user.save((err, user) => {
      if (err) {
        throw err;
      }
      if (user) {
        req.logout();
        res.redirect("/");
      }
    });
  });
});

app.listen(port, () => {
  console.log(`server is running on port ${port}`);
});
