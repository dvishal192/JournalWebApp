//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const _ = require('lodash');
const passport = require("passport");
const session = require("express-session");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-find-or-create');
const nodemailer = require('nodemailer');
require('dotenv').config();


const uuid = require('uuid');

//Acquiring mongoose 
const mongoose = require('mongoose');

const homeStartingContent = "Lacus vel facilisis volutpat est velit egestas dui id ornare. Semper auctor neque vitae tempus quam. Sit amet cursus sit amet dictum sit amet justo. Viverra tellus in hac habitasse. Imperdiet proin fermentum leo vel orci porta. Donec ultrices tincidunt arcu non sodales neque sodales ut. Mattis molestie a iaculis at erat pellentesque adipiscing. Magnis dis parturient montes nascetur ridiculus mus mauris vitae ultricies. Adipiscing elit ut aliquam purus sit amet luctus venenatis lectus. Ultrices vitae auctor eu augue ut lectus arcu bibendum at. Odio euismod lacinia at quis risus sed vulputate odio ut. Cursus mattis molestie a iaculis at erat pellentesque adipiscing.";
const aboutContent = "Hac habitasse platea dictumst vestibulum rhoncus est pellentesque. Dictumst vestibulum rhoncus est pellentesque elit ullamcorper. Non diam phasellus vestibulum lorem sed. Platea dictumst quisque sagittis purus sit. Egestas sed sed risus pretium quam vulputate dignissim suspendisse. Mauris in aliquam sem fringilla. Semper risus in hendrerit gravida rutrum quisque non tellus orci. Amet massa vitae tortor condimentum lacinia quis vel eros. Enim ut tellus elementum sagittis vitae. Mauris ultrices eros in cursus turpis massa tincidunt dui.";
const contactContent = "Scelerisque eleifend donec pretium vulputate sapien. Rhoncus urna neque viverra justo nec ultrices. Arcu dui vivamus arcu felis bibendum. Consectetur adipiscing elit duis tristique. Risus viverra adipiscing at in tellus integer feugiat. Sapien nec sagittis aliquam malesuada bibendum arcu vitae. Consequat interdum varius sit amet mattis. Iaculis nunc sed augue lacus. Interdum posuere lorem ipsum dolor sit amet consectetur adipiscing elit. Pulvinar elementum integer enim neque. Ultrices gravida dictum fusce ut placerat orci nulla. Mauris in aliquam sem fringilla ut morbi tincidunt. Tortor posuere ac ut consequat semper viverra nam libero.";




//Connecting mongoose to mongoDb and creating a blogDB database
mongoose.connect('mongodb+srv://devesh-admin:${process.env.PASSWORD}@cluster0.yjqirxx.mongodb.net/blogDB', {
    useNewUrlParser: true
});




//mongodb+srv://devesh-admin:<password>@cluster0.yjqirxx.mongodb.net/?retryWrites=true&w=majority
//Delete from ?

const uniqueId = uuid.v1();

//Adding the confirmation Code
const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
let token = "";
for(var i = 0; i <= 10 ; i++){
    token = token + characters[Math.floor(Math.random() * characters.length)]
};
console.log(token);   

const userSchema = new mongoose.Schema ({
    username:String,
    password: String,
    googleId: String,
    status : {type:String, enum:['Pending','Active'], default: 'Pending'},
    confirmationCode : {type:String, default: token},
    id: { type: String, default: uniqueId}
});


//Adding the NodeMailer credentials-- Local staging hence directly in source code
var transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "vishaldevesh544@gmail.com",
    pass: "Qwerty123!@",
  },
});


userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
const User = new mongoose.model("User",userSchema);


//Creating postSchema 
const postSchema = new mongoose.Schema ({    
    post_title: String,
    post_body: String,
    id: { type: String, default: uniqueId}
});


//Creating a new mongoose model
const Post = new mongoose.model("Post", postSchema);


const app = express();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(express.static("public"));


app.use(session({
    secret: 'My own secret',
    resave: false,
    saveUninitialized: false,
}));



app.use(passport.initialize()); //To initalise the passport module .initialise is bundled with the passport module.
app.use(passport.session()); //Use session as well.




passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


//passport.serializeUser(function(user,done){
//    done(null,user.id);
//})
//
//passport.deserializeUser(function(id,done){
//    User.findById(id,function(err,user){
//        done(err,user);
//    });
//});


//Implementation of Google OAuth Sign In.
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/journal",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));




let posts = []; 


app.get("/homeNew",function(req,res){
    res.render("homeNew.ejs");
});


app.get("/login",function(req,res){
    res.render("login.ejs");
});

app.get("/register",function(req,res){
    res.render("register.ejs");
});



app.post("/register", function(req, res){

    User.register({username: req.body.username, active: false}, req.body.password,function(err, newUser){
        if(err){
            console.log(err);
            res.redirect("/login")
        }else{
            passport.authenticate("local")(req, res, function(){
                res.redirect("/");
            });
        }
//        nodemailer.sendConfirmationEmail(User.username,User.confirmationCode);
    
    });

});



//Continuing with NodeMailer - Although Gmail blocks majority of such mails, other than NodeMailer - MailTrap API was an option

var mailOptions = {
    from:"vishaldevesh544@gmail.com",
    to: User.username,
    subject:"Please confirm the account",
    html:`<h1>Confirm</h1>
        <h2>Hello ${User.username}</h2>
        <p>Thank you for subscrbing Please confirm your email by clicking on the following link</p>
        <a href=http://localhost:3000/confirm/${User.confirmationCode}> Click here</a>`
};

transporter.sendMail(mailOptions, function(error, info){
  if (error) {
    console.log(error);
  } else {
    console.log('Email sent: ' + info.response);
  }
});




app.get("/", function (req, res) {
    

    if(req.isAuthenticated()){
           Post.find(function(err,posts){
               res.render("home.ejs", {
                   startingContent: homeStartingContent,
                   posts: posts 
    })
    });
        
    }else {
        res.redirect("/login");
    }
});




app.get("/posts/:postId", function (req, res) {
    
    const requestedPostId = req.params.postId;
    
    Post.findOne({_id:requestedPostId},function(err,posts){
        res.render("post",{
            passoverTitle:posts.post_title,
            passoverBody:posts.post_body
        });        
    });
    
});

// Looped variable for posts aray version-2.0

//    for (var i = 0; i < posts.length; i++) {
//        var stringEntered = _.lowerCase(req.params.postname);
//        //        console.log(stringEntered);
//        var postToCheck = _.lowerCase(posts[i].post_title)
//        //        console.log(postToCheck);
//        var blogPost = posts[i].post_body;
//        if (stringEntered === postToCheck) {
//            //            console.log("Match Found!");
//            res.render("post.ejs", {
//                passoverTitle: req.params.postname,
//                passoverBody: posts[i].post_body
//            });
//        };
//    }
//});




app.get("/about", function (req, res) {
    res.render("about.ejs", {
        AboutContent: aboutContent
    });
});

app.get("/contact", function (req, res) {
    res.render("contact.ejs", {
        ContactContent: contactContent
    });
});

app.get("/compose", function (req, res) {
    res.render("compose.ejs");
});


//Implementation of Google OAuth Authentication 

app.get("/auth/google",function(req,res){
    passport.authenticate('google', { scope: ["profile"] });
    console.log(req);
});



app.get("/auth/google/journal", 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/');
  });




app.post("/compose", function (req, res) {
//        let message = {
//            post_title: req.body.input_box_title,
//            post_body: req.body.input_box_post
//        };
//        posts.push(message)
//    res.redirect("/")
    
    const post = new Post({
        post_title: req.body.input_box_title,
        post_body: req.body.input_box_post
    });
    post.save(function(err){
        if(!err){
            res.redirect("/");    
        }
    });
    
});


app.post("/login", function(req, res){

    const newuser = new User({
        username: req.body.username,
        password: req.body.password
    });
    

    req.login(newuser, function(err){
        if(err){
            console.log(err);
            res.redirect("/homeNew");
        }else{
            passport.authenticate("local")(req, res, function(){
                res.redirect("/");
            });
        }
    });
});



app.get("/logout", function (req, res) {
    req.logout(function(){
      res.redirect("/login");  
    });
});


app.listen(process.env.PORT || 3000, function () {
    console.log("Server started on port 3000");
});
