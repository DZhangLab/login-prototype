// Install required npm packages
require('dotenv').config();

const express = require("express");

const app = express();

const https = require("https");

const bodyParser = require("body-parser");

const mongoose = require("mongoose");

const bcrypt = require('bcryptjs');

const salt = bcrypt.genSaltSync(10);

const mysql = require("mysql");

const ejs = require("ejs");

const session = require("express-session");

const passport = require("passport");

const passportLocalMongoose = require("passport-local-mongoose");

const GoogleStrategy = require('passport-google-oauth20').Strategy;

const FacebookStrategy = require("passport-facebook");

const TwitterStrategy = require("passport-twitter");

const LocalStrategy = require('passport-local').Strategy;

const accountSid = process.env.TWILLOSID;

const authToken = process.env.TWILLOWTOKEN;

const client = require('twilio')(process.env.TWILLOSID, process.env.TWILLOWTOKEN);

const findOrCreate = require("mongoose-findorcreate");

const jsdom = require("jsdom");
const {
  JSDOM
} = jsdom;
const {
  window
} = new JSDOM();
const {
  document
} = (new JSDOM('')).window;
global.document = document;

const $ = jQuery = require('jquery')(window);

// use ejs, body parser, public css for the webiste
app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(express.static("public"));

app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());

app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/loginDB");

const userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: String,
  phone: String,
  googleID: String,
  facebookId: String,
  sentTime: String,
  verCode: String,
  password: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);


const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());



passport.serializeUser(function(user, done) {
    done(null, user.id);
   // where is this user.id going? Are we supposed to access this anywhere?
});

// used to deserialize the user
passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
        done(err, user);
    });
});
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {




    User.findOrCreate({ googleID: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

passport.use(new FacebookStrategy({
    clientID: process.env.APP_ID,
    clientSecret: process.env.APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

passport.use(new TwitterStrategy({
    consumerKey: process.env.TWITTER_CONSUMER_KEY,
    consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
    callbackURL: "http://localhost:3000/auth/twitter/callback"
  },
  function(token, tokenSecret, profile, cb) {
    User.findOrCreate({ twitterId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


app.get('/auth/twitter',
  passport.authenticate('twitter'));

app.get('/auth/twitter/callback',
  passport.authenticate('twitter', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/');
  });



//the get route for google auth
app.get("/auth/google",
  passport.authenticate("google", {
    scope: ["profile"]
  })
);

// the callback route for google
app.get("/auth/google/secrets",
  passport.authenticate("google", {
    failureRedirect: "/login"
  }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/content');
  });

// the get route for facebook auth
app.get('/auth/facebook',
  passport.authenticate('facebook', {
    scope: ['public_profile']
  }));

// the callback route for facebook
app.get("/auth/facebook/secrets",
  passport.authenticate('facebook', {
    failureRedirect: '/login'
  }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/content');
  });

// home route
app.get("/", function(req, res) {
  res.render("home");
});

// login route
app.get("/login", function(req, res) {
  res.render("login");
});

// signup route
app.get("/signup", function(req, res) {
  res.render("signup");
});

app.get("/success", function(req,res){
  res.render("success");
})

// content route after successfully login or authenticated by Oauth
app.get("/content", function(req, res) {
  res.render("content");
  // if (req.isAuthenticated()) {
  //   res.render("content");
  // } else {
  //   res.redirect("/login");
  // }
});

// the route for 2fa
app.get("/2fa/:postName", function(req, res) {


  if (req.isAuthenticated()) {
    const authEmail = req.params.postName;
    let verCodeRandom = 0
    while (verCodeRandom < 99999) {
      verCodeRandom = Math.round(Math.random() * 1000000);
    }

    //generate random code
    const sentTime = Math.round(Date.now() / 1000);
    // const userCode = "UPDATE login_info SET vercode =" + verCodeRandom + ", sent_time = " + sentTime + " WHERE email = '" + authEmail + "'";
    //console.log(userCode);
    User.updateOne({username: authEmail}, {sentTime: sentTime, verCode: verCodeRandom}, function(err, result) {
      if (err) throw err;

      res.render("2fa", {
        emailAddress: authEmail
      });
    });
  } else{
    res.redirect("/login");
  }


  // store the verification code and timestamp into database
  // con.query(userCode, function(err, result, field) {
  //   if (err) throw err;
  //   else {
  //     console.log("vercode successfully inserted to database");
  //   }
  // })
  //send code to phone using twillo api
  // client.messages
  //   .create({
  //     body: "Your verification code is: " + verCodeRandom + ". Please do not share with other people. The code will expire in 10 minutes.",
  //     from: '+17657538135',
  //     to: '+12015771959'
  //   })
  //   .then(message => console.log(message.status));
  // res.render("2fa", {
  //   emailAddress: authEmail
  // });
});

// post route for user sending back the verification code they recieve
app.post("/2fa", function(req, res) {
  console.log(req.body.verCode.join(""));
  console.log(req.body.email);
  const postEmail = req.body.email;
  //const getCode = "SELECT vercode, sent_time FROM login_info WHERE email = '" + postEmail + "'"
  const verificationCode = req.body.verCode.join("");

User.findOne({username: postEmail}, function(err, result) {
  if (err) throw err;
  console.log(result);
  const vercodeInDB = result.verCode;
    const timeSent = result.sentTime;
    const timeDiff = Math.round(Date.now() / 1000) - timeSent;
    console.log(timeDiff);
    if (timeDiff < 600) {
      if (verificationCode === vercodeInDB) {
        res.redirect("/content");
      }
    }
});


  // get the verification code from the database and check with the code entered by user
  // con.query(getCode, function(err, result, field) {
  //   if (err) throw err;
  //   const vercodeInDB = result[0].vercode;
  //   const timeSent = result[0].sent_time;
  //   const timeDiff = Math.round(Date.now() / 1000) - timeSent;
  //   console.log(timeDiff);
  //   if (timeDiff < 600) {
  //     if (verificationCode === vercodeInDB) {
  //       res.redirect("/content");
  //     }
  //   }
  // })
});

// post route for login comparing the hash to check if they can match
app.post("/login", function(req, res) {
  const email = req.body.username;
  const password = req.body.password;
  //const validation = "SELECT password FROM login_info WHERE email = '" + email + "'";

  const user = new User({
    username: email,
    password: password
  });
  req.login(user, function(err){
    if (err){
      console.log(err);
    } else {
      console.log("successfully")
      passport.authenticate("local") (req,res, function(){
        console.log("check")
        res.redirect("/2fa/" + email);
      });
    }
  });



});

// post route for signup
app.post("/signup", function(req,res){
  console.log(req.body.firstName);
  const firstName = req.body.firstName;
  const lastName = req.body.lastName;
  const email = req.body.username;
  const phone = req.body.phone;
  const password = req.body.password;

  const newUser = new User({
    email: email,
    firstName: firstName,
    lastName: lastName,
    phone: phone,
    password: password
  });


  User.register({username: email, firstName: firstName, lastName: lastName, phone: phone}, password, function(err, user){
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function(){
        console.log("went through")
        res.redirect("/success");
      });
    }
  });

});

// listenning to port 3000
app.listen(3000, function() {
  console.log("server 3000 is on");
});
