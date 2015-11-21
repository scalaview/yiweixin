var express = require('express');
var app = express.Router();
var models  = require('../../models')
var helpers = require("../../helpers")
var async = require("async")


app.get('/send-message', function(req, res) {
  models.MessageQueue.canSendMessage(req.query.phone, req.query.type, function(messageQueue) {
    if(messageQueue){
      res.json({ msg: "Please try again after 1 minite" });
    }else{
      if(req.query.type === 'register'){
        models.MessageQueue.sendRegisterMessage(req.query.phone, function(messageQueue){
          if(messageQueue){
            res.send("message had send")
          }
        }, function(err){
          req.flash('errors', err.errors)
          res.send("try again later")
        })
      }
    }
  })
})

app.get('/create-menus', function(req, res) {
  async.waterfall([token,
    function(callback){
      menu.createMenus(accessToken.getToken(), config.menus, function(status, error){
        if(status){
          res.send("create success")
        }else{
          res.send("create fail: code [" + error.errcode + "], mesg: [" + error.errmsg + "] ")
        }
    })}], function(error, callback){
      console.log(error)
    })
})


app.get('/successmsg', function(req, res) {
  res.render('yiweixin/withdrawal/successmsg')
})

app.get('/errmsg', function(req, res) {
  res.render('yiweixin/withdrawal/errmsg')
})

module.exports = app;