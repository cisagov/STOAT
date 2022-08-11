var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const fileUpload = require('express-fileupload')

require('dotenv').config()

var indexRouter = require('./routes/index');

printStoat();


var app = express();

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(fileUpload())

app.use('/', indexRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});



// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.end()
});

function printStoat() {
  console.log("                                                      @@@@@")
  console.log(" #####  ######### #######      #     ######### @@@@@@@@@@@@@@@@@@@                  @@");
  console.log("#     #     #    #       #    # #        #  @@@@@@@@@@@@@@@@@@@@@@@@@@@@           %@@@@@@");
  console.log("#           #    #       #   #   #       @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@   @@@@@****@()@");
  console.log("#           #    #       #  #     #    @@@@@@@@*@@@@*@@********@@@@@@@@@@@@@@@@@@*@@@@*@@@@@@@@");
  console.log(" #####      #    #      @@@@@@###### @@@@@@@@@@*@@@@@**@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@");
  console.log("      #     #    #     @@@@@@@@@@@@@@@@@@@@@@@*@@@@@*            *@@@@*@@@@*@@@*@@@@@@@");
  console.log("      #     #    #       # @@@@@@@@@@@   #@@@@*@@@                @@@@@    *@@@@");
  console.log("#     #     #    #       # #  @@@@@@@   @@@@   @@@@                @@@@      @@@");
  console.log(" #####      #     #######  #       #   @@@@   @@@@                 @@@@     @*@");
  console.log("----------------------------------------@@@@@  @@@@                 @@@@")
  console.log("                                               ");
}


module.exports = app;
