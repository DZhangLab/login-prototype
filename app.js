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

const LocalStrategy = require('passport-local').Strategy;

const accountSid = process.env.TWILLOSID;

const authToken = process.env.TWILLOWTOKEN;

const client = require('twilio')(process.env.TWILLOSID, process.env.TWILLOWTOKEN);

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

// connect to MySQL serve, the user and password should be replaced in the future when connecting to cloud database
const con = mysql.createConnection({
  host: "127.0.0.1",
  user: "root",
  password: "root",
  database: "userdb"
});

// connecting to sql server
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

// create customer fields
const customeFields = {
  usernameField: "uname",
  passowrdFiled: "pw"
};

// create verifycallback function to get the user info from the database
const verifyCallback = (username, password, done) => {
  con.query("SELECT * FROM login_info WHERE email = ?", [username], function(err, results, fields) {
    if (err)
      return done(err);
    if (results.length === 0) { // the user is not in the database
      return done(null, false);
    }
    const isValid = validPassword(password, results[0].hash);
    user = {
      email: results[0].email,
      hash: results[0].hash,
      salt: results[0].salt
    };
    if (isValid) {
      return done(null, user);
    } else {
      return done(null, false);
    }
  });
}

// initialize local strategy
const strategy = new LocalStrategy(customeFields, verifyCallback);
passport.use(strategy);

// use to serialize the user
passport.serializeUser(function(user, done) {
  done(null, user);
});

// used to deserialize the user
passport.deserializeUser(function(id, done) {
  con.query("SELECT * FROM login_info WHERE facebook_id = '" + id + "' OR google_id = '" + id + "'", function(err, rows) {
    done(err, rows[0]);
  });
});

// create the function validpassword to validate the password
function validPassword(password, hash) {
  return bcrypt.compare(password, hash)
}

// create the function to genreate the hash for password
function genPassword(password) {
  const salt = bcrypt.genSaltSync(10);
  bcrypt.hash(password, salt, function(err, hash) {
    if (err) {
      console.log(err);
    }
    return {
      salt: salt,
      hash: hash
    }
  });
}

// function that chech if the session is authenticated
function isAuth(req, res, next) {
  if (req.isAuthenticated()) {
    next();
  } else {
    res.send("not authorized");
  }
}

// function that check if the user exists
function userExists(req, res, next) {
  con.query("SELECT * FROM login_info WHERE email = ?", [req.body.email], function(err, results, fields) {
    if (err) {
      console.log("err")
    } else if (results.length > 0) {
      res.send("user exists");
    } else {
      next();
    }
  });
}

// call the google strategy
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

// call the facebook strategy
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

// test route
// app.get("/test/:postName", function(req, res) {
//   const userEmail = req.params.postName;
//   console.log(userEmail);
//   con.query("SELECT vercode FROM login_info", function(err, result, field) {
//     if (err) throw err;
//     else {
//       console.log(result[0].password);
//       if (result[0].password === 10) {
//         console.log("it is equal");
//       } else {
//         console.log("it is not equal");
//       }
//     }
//   })
// });

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
  const authEmail = req.params.postName;
  let verCodeRandom = 0
  while (verCodeRandom < 99999) {
    verCodeRandom = Math.round(Math.random() * 1000000);
  }
  //   const date_ob = new Date();
  // // current date
  // // adjust 0 before single digit date
  // let date = ("0" + date_ob.getDate()).slice(-2);
  // // current month
  // let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);
  // // current year
  // let year = date_ob.getFullYear();
  // // current hours
  // let hours = date_ob.getHours();
  // // current minutes
  // let minutes = date_ob.getMinutes();
  // // current seconds
  // let seconds = date_ob.getSeconds();
  // // prints date in YYYY-MM-DD format
  // // prints date & time in YYYY-MM-DD HH:MM:SS format
  // const sentTime = year + "-" + month + "-" + date + " " + hours + ":" + minutes + ":" + seconds;

  //generate random code
  const sentTime = Math.round(Date.now() / 1000);
  const userCode = "UPDATE login_info SET vercode =" + verCodeRandom + ", sent_time = " + sentTime + " WHERE email = '" + authEmail + "'";
  console.log(userCode);
  // store the verification code and timestamp into database
  con.query(userCode, function(err, result, field) {
    if (err) throw err;
    else {
      console.log("vercode successfully inserted to database");
    }
  })
  //send code to phone using twillo api
  client.messages
    .create({
      body: "Your verification code is: " + verCodeRandom + ". Please do not share with other people. The code will expire in 10 minutes.",
      from: '+17657538135',
      to: '+12015771959'
    })
    .then(message => console.log(message.status));
  res.render("2fa", {
    emailAddress: authEmail
  });
});

// post route for user sending back the verification code they recieve
app.post("/2fa", function(req, res) {
  console.log(req.body.verCode.join(""));
  console.log(req.body.email);
  const postEmail = req.body.email;
  const getCode = "SELECT vercode, sent_time FROM login_info WHERE email = '" + postEmail + "'"
  const verificationCode = req.body.verCode.join("");

  // get the verification code from the database and check with the code entered by user
  con.query(getCode, function(err, result, field) {
    if (err) throw err;
    const vercodeInDB = result[0].vercode;
    const timeSent = result[0].sent_time;
    const timeDiff = Math.round(Date.now() / 1000) - timeSent;
    console.log(timeDiff);
    if (timeDiff < 600) {
      if (verificationCode === vercodeInDB) {
        res.redirect("/content");
      }
    }
  })
});

// post route for login comparing the hash to check if they can match
app.post("/login", function(req, res) {
  const email = req.body.email;
  const password = req.body.password;
  const validation = "SELECT password FROM login_info WHERE email = '" + email + "'";
  con.query(validation, function(err, result, fields) {
    if (err) {
      console.log(err);
    }
    if (result.length != 0) {
      if (bcrypt.compare(password, result[0].password)) {
        res.redirect("/2fa/" + email);
      }
    } else {
      res.redirect('/login?error=' + encodeURIComponent('Incorrect_Credential'));
    }
  })
});

// post route for signup
app.post("/signup", userExists, (req, res, next) => {
  console.log(req.body.firstName);
  const firstName = req.body.firstName;
  const lastName = req.body.lastName;
  const email = req.body.email;
  const phone = req.body.phone;
  const password = req.body.password;

  //const saltHash = genPassword(password);
  //console.log(saltHash);
  //const saltNew = saltHash.salt;
  //const hashNew = saltHash.hash;

  // generate hash for the password
  bcrypt.hash(password, salt, function(err, hash) {
    if (err) {
      console.log(err);
    }
    // store the user information into the sql database
    const newUser = "INSERT INTO login_info (email, firstName, lastName, phoneNumber, password, salt) VALUES (?,?,?,?,?,?)";
    console.log(newUser);
    con.query(newUser, [email, firstName, lastName, phone, hash, salt], function(err, result, fields) {
      if (err) throw err;
      console.log("new user added ");
    });
    res.redirect("/2fa/" + email);
  });

  // bcrypt.hash(password, salt, function(err, hash) {
  //     console.log(salt);
  //     console.log(hash);
  // })
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
  //       }
  //     })
  //   }))
});

// listenning to port 3000
app.listen(3000, function() {
  console.log("server 3000 is on");
});
