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
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const FacebookStrategy = require("passport-facebook");

//const LocalStrategy = require('passport-local').Strategy;

const accountSid = process.env.TWILLOSID;
const authToken = process.env.TWILLOWTOKEN;
const client = require('twilio')(process.env.TWILLOSID, process.env.TWILLOWTOKEN);

var verCodeRandom = 0;

var jsdom = require("jsdom");
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

var $ = jQuery = require('jquery')(window);


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


// connect to MySQL serve
const con = mysql.createConnection({
  host: "127.0.0.1",
  user: "root",
  password: "root",
  database: "userdb"
});


con.connect(function(err) {
  if (err) throw err;
  console.log("connected");
  con.query("CREATE DATABASE IF NOT EXISTS userdb", function(err, result) {
    if (err) throw err;
    console.log("database created");
  });

  const sqlQuery = "CREATE TABLE IF NOT EXISTS login_info (email varchar(30), firstName varchar(30), lastName varchar(30), phoneNumber varchar(30), password varchar(30))"
  con.query(sqlQuery, function(err, result) {
    if (err) {
      console.log(err);
    };
    console.log("login info table created");
  });
});
// const user1 = new User({name: "harry", password: "password"});
//
// user1.save();




// =========================================================================
// passport session setup ==================================================
// =========================================================================
// required for persistent login sessions
// passport needs ability to serialize and unserialize users out of session

// used to serialize the user for the session



// passport.use(User.createStrategy());
//
// passport.serializeUser(function(user, done) {
//     done(null, user.id);
//    // where is this user.id going? Are we supposed to access this anywhere?
// });
//
// // used to deserialize the user
// passport.deserializeUser(function(id, done) {
//     User.findById(id, function(err, user) {
//         done(err, user);
//     });
// });
//



const customeFields = {
  usernameField: "uname",
  passowrdFiled: "pw"
};







  passport.serializeUser(function(user, done) {
    done(null, user);
  });

// used to deserialize the user
passport.deserializeUser(function(id, done) {
  con.query("SELECT google_id FROM login_info WHERE facebook_id = '" + id + "' OR google_id = '" + id + "'", function(err, rows) {
    done(err, rows[0]);
  });
});


passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    scope: ['https://www.googleapis.com/auth/plus.login',
      'https://www.googleapis.com/auth/userinfo.email'
    ]
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);

    const findUser = "SELECT google_id FROM login_info WHERE google_id = '" + profile.id + "'";
    //console.log(findUser);
    con.query(findUser, function(err, result, field) {
      if (err) throw err;

      console.log(result);
      if (result.length === 0) {
        con.query("INSERT INTO login_info (google_id) VALUES ('" + profile.id + "')", function(err, result, field) {
          if (err) throw err;

        });


      } else {
        // if (result[0].google_id === profile.id) {
        //
        // }
        //
      }
      //return cb(err, user);
      return cb(err, profile.id);
    });



  }
));

passport.use(new FacebookStrategy({
    clientID: process.env.APP_ID,
    clientSecret: process.env.APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    const findUser = "SELECT google_id FROM login_info WHERE facebook_id = '" + profile.id + "'";
    //console.log(findUser);
    con.query(findUser, function(err, result, field) {
      if (err) throw err;

      console.log(result);
      if (result.length === 0) {
        con.query("INSERT INTO login_info (facebook_id) VALUES ('" + profile.id + "')", function(err, result, field) {
          if (err) throw err;

        });


      } else {
        // if (result[0].google_id === profile.id) {
        //
        // }
        //
      }
      //return cb(err, user);
      return cb(err, profile.id);
    });


  }
));

//
app.get("/auth/google",
  passport.authenticate("google", {
    scope: ["profile"]
  })
);


app.get("/auth/google/secrets",
  passport.authenticate("google", {
    failureRedirect: "/login"
  }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/content');
  });



//
app.get('/auth/facebook',
  passport.authenticate('facebook', {
    scope: ['public_profile']
  }));

app.get("/auth/facebook/secrets",
  passport.authenticate('facebook', {
    failureRedirect: '/login'
  }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/content');
  });







app.get("/", function(req, res) {

  res.render("home");
});

app.get("/login", function(req, res) {

  res.render("login");
});

app.get("/signup", function(req, res) {
  res.render("signup");
});

app.post("/", function(req, res) {
  console.log(req.body.password);

});
app.get("/test/:postName", function(req, res) {
  const userEmail = req.params.postName;
  console.log(userEmail);
  con.query("SELECT vercode FROM login_info", function(err, result, field) {
    if (err) throw err;
    else {
      console.log(result[0].password);
      if (result[0].password === 10) {
        console.log("it is equal");
      } else {
        console.log("it is not equal");
      }

    }
  })
});

app.get("/content", function(req, res) {

  if (req.isAuthenticated()) {
    res.render("content");
  } else {
    res.redirect("/login");
  }
});

app.get("/2fa/:postName", function(req, res) {


  const authEmail = req.params.postName;
  verCodeRandom = Math.round(Math.random() * 1000000);
  const userCode = "UPDATE login_info SET vercode =" + verCodeRandom + " WHERE email = '" + authEmail + "'";
  con.query(userCode, function(err, result, field) {
    if (err) throw err;
    else {
      console.log("vercode successfully inserted to database");
    }
  })

  // send code to phone
  // client.messages
  //   .create({
  //      body: "Your verification code is: " + verCodeRandom + ". Please do not share with other people",
  //      from: '+17657538135',
  //      to: '+12015771959'
  //    })
  //   .then(message => console.log(message.status));
  res.render("2fa", {
    emailAddress: authEmail
  });
});

app.post("/2fa", function(req, res) {
  console.log(req.body.verCode.join(""));
  console.log(req.body.email);
  const postEmail = req.body.email;
  const getCode = "SELECT vercode FROM login_info WHERE email = '" + postEmail + "'"
  const verificationCode = req.body.verCode.join("");
  con.query(getCode, function(err, result, field) {
    if (err) throw err;
    const vercodeInDB = result[0].vercode;
    if (verificationCode === vercodeInDB) {
      res.send("successfully verfied. Further website to be set. ");
    }
  })
  //console.log(verCodeRandom);
  //console.log(verificationCode);
});

app.post("/login", function(req, res) {
  const email = req.body.email;
  const password = req.body.password;
  const validation = "SELECT password FROM login_info WHERE email = '" + email + "'";
  con.query(validation, function(err, result, fields) {
    if (err) {
      console.log(err);
    }
    if (result.length != 0) {
      if (result[0].password === password) {
        res.redirect("/2fa/" + email);
      }
    } else {
      res.redirect('/login?error=' + encodeURIComponent('Incorrect_Credential'));
    }
  })
  // res.send("reviced info");
});

app.post("/signup", function(req, res) {
  console.log(req.body.firstName);
  const firstName = req.body.firstName;
  const lastName = req.body.lastName;
  const email = req.body.email;
  const phone = req.body.phone;
  const password = req.body.password;



  bcrypt.hash(password, salt, function(err, hash) {
      console.log(hash);
  })

  // passport.use("local-signup", new LocalStrategy({
  //     usernameField: email,
  //     passwordField: password,
  //     passReqToCallback: true
  //   },
  //   function(req, email, password, done) {
  //     console.log("this is a check makr");
  //     con.query("SELECT email FROM login_info WHERE email = '" + email + "'", function(err, result, field) {
  //       console.log(result);
  //       if (err) return done(err);
  //       if (result.length != 0) {
  //         var newUserMysql = new Object();
  //
  //         newUserMysql.email = email;
  //         newUserMysql.password = password; //
  //
  //         const newUser = "INSERT INTO login_info (email, firstName, lastName, phoneNumber, password) VALUES ('" + email + "','" + firstName + "','" + lastName + "','" + phone + "','" + password + "') ";
  //         console.log(newUser);
  //
  //         con.query(newUser, function(err, result, fields) {
  //           if (err) throw err;
  //           console.log("new user added");
  //         });
  //
  //         res.redirect("/2fa/" + email);
  //
  //
  //       }
  //     })
  //
  //   }))
});









// const newUser = "INSERT INTO login_info (email, firstName, lastName, phoneNumber, password) VALUES ('" + email + "','" + firstName + "','" + lastName + "','" + phone + "','" + password + "') "; console.log(newUser);
//
// con.query(newUser, function(err, result, fields) {
//   if (err) throw err;
//   console.log("new user added");
// });
//
// res.redirect("/2fa/" + email);
//
// });








app.listen(3000, function() {
  console.log("server 3000 is on");
});
