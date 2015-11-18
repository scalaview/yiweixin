var express = require('express');
var app = express.Router();
var models  = require('../../models')
var helpers = require("../../helpers")
var formidable = require('formidable')
var async = require("async")
var OAuth = require('wechat-oauth');
var config = require("../../config")
var wechat = require('wechat')
var WechatAPI = require('wechat-api');
var api = new WechatAPI(config.appId, config.appSecret);

var maxDepth = config.max_depth

var wechatConfig = {
  token: config.token,
  appid: config.appId,
  encodingAESKey: config.aesKey
}

app.use('/wechat', wechat(wechatConfig, function (req, res, next) {
  var menusKeys = config.menus_keys
  var message = req.weixin;
  if (message.EventKey === menusKeys.button1) {
    res.reply('hehe');
  }else{
    res.reply([
      {
        title: '',
        description: '新手任务',
        picurl: 'http://mmbiz.qpic.cn/mmbiz/JkicEhnibw1DDgqib0QzeiaPEqzcpyn6Ak51LFHjlzCL2Xw392Y52pvc7yHYkzg1IeJWCkC2RicTSicicH9fwictAAkrVw/640?wx_fmt=jpeg&tp=webp&wxfrom=5',
        url: 'http://mp.weixin.qq.com/s?__biz=MzIyNTAxODU2NQ==&mid=207857350&idx=1&sn=103c09576aac256b672659a7205b675f&scene=0#rd'
      }
    ])
  }
}))


function unsubscribe(message, res) {
  var openid = message.openid

  async.waterfall([function(next) {
    models.Customer.findOne({
      where: {
        wechat: openid
      }
    }).then(function (customer) {
      if(customer && customer.isSubscribe){
        customer.updateAttributes({
          isSubscribe: false
        }).then(function(customer) {
          next(null, customer)
        })
      }else{
        return
      }
    })
  }], function(err) {
    res.reply('')
  })

}


function subscribe(message, res){
  var customerId = message.scene_id,
      openid = message.openid

  async.waterfall([function(next) {
    models.Customer.findOne({
      where: {
        wechat: openid
      }
    }).then(function (customer) {
      if(customer && customer.isSubscribe){
        return
      }else if(customer && !customer.isSubscribe){
        customer.updateAttributes({
          isSubscribe: true
        }).then(function(customer) {
          return
        }).catch(function(err) {
          next(err)
        })
      }else{
        next(null, openid)
      }
    })
  }, function(openid, next) {
    api.getUser(openid, function(err, result) {
      if(err){
        next(err)
      }else{
        next(null, result)
      }
    });
  }, function(result, next) {
    module.Customer.findById(customerId).then(function(customer) {
      next(null, customer, result)
    })
  }, function(recommend, result, next) {
      // new customer
      var ancestryArr = recommend.getAncestry().push(recommend.id)

      var ancestryStr = (ancestryArr.length > maxDepth) ? recommend.getAncestry().join('/')  : recommend.getAncestry().push(recommend.id).join('/')

      var ancestryDepth = ((parseInt(recommend.ancestryDepth) + 1) > maxDepth ) ? maxDepth : (parseInt(recommend.ancestryDepth) + 1)

      models.Customer.build({
        password: '1234567',
        phone: "11111111111",
        username: result.nickname,
        wechat: result.openid,
        sex: result.sex + '',
        city: result.city,
        province: result.province,
        country: result.country,
        headimgurl: result.headimgurl,
        subscribeTime: result.subscribe_time,
        ancestry: ancestryStr,
        ancestryDepth: ancestryDepth
      }).save().then(function(customer) {
        next(null, customer)
      }).catch(function(err) {
        next(err)
      })
  }], function(err, newCustomer) {
    if(err){
      console.log(err)
    }else{
      res.reply('')
    }
  })


}

module.exports = app;
