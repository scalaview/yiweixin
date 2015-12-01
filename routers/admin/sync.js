var express = require('express');
var admin = express.Router();
var models  = require('../../models')
var helpers = require("../../helpers")
var async = require("async")
var _ = require('lodash')
var crypto = require('crypto')
var config = require("../../config")
var request = require("request")


admin.get('/synchuawo', function(req ,res) {
  var host = 'http://' + config.huawo_hostname

  var params = {
        account: config.huawo_account,
        type: 0
      }

  var keys = Object.keys(params)
  keys.sort()
  var sign_params = []
  for(var i = 0; i < keys.length; i++) {
    sign_params.push( keys[i] + "=" + params[keys[i]] )
  }
  sign_params.push("key=" + config.huawo_api_key)
  params['v'] = '1.1'
  params['action'] = 'getPackage'
  params['sign'] = crypto.createHash('md5').update(sign_params.join('&'), 'utf8').digest("hex")
  var options = {
    uri: host,
    method: 'GET',
    qs: params
  }
  console.log(options)

  request(options, function (error, responce) {
    if (!error && responce.statusCode == 200) {
      var data = JSON.parse(responce.body)
      console.log(data)
      if(data.Code == 0){
        syncData(data, res)
      }
    }else{
      res.send(error)
    }
   });

})

// TrafficPlan.Provider = {
//     '中国移动': 0,
//     '中国联通': 1,
//     '中国电信': 2
//   }

function syncData(data, res){

  function getProviderType(type){
    switch(type)
    {
      case 1:  //1:移动
        return models.TrafficPlan.Provider['中国移动']
      case 2:  //2:联通
        return models.TrafficPlan.Provider['中国联通']
      case 3:  //2:联通
        return models.TrafficPlan.Provider['中国电信']
    }
  }

  function getValue(string){
    var y = /[M|G]/,
        end = y.exec(string)
    if(end.index + 1 <= string.length){
      var unit = string.substring(end.index, end.index + 1)
    }else{
      var unit = 'M'
    }
    var size = string.replace(/[^0-9]/ig,"")
    if(unit.toLowerCase() == 'g' ){
      return parseInt(size) * 1024
    }else{
      return parseInt(size)
    }
  }

  var packages = data.Packages
/*
{
  "Type": 1,
  "Package": 3000,
  "Name": "3G",
  "Price": 100
},
*/

  async.map(packages, function(pg, pass) {
    var params = {
      providerId: getProviderType(pg.Type),
      value: getValue(pg.Name),
      name: pg.Name,
      cost: pg.Price * 100,
      type: 2,
      bid: pg.Package
    }
    console.log(params)
    models.TrafficPlan.build(params).save().then(function(plan) {
      pass(null, plan)
    }).catch(function(err) {
      pass(err)
    })

  }, function(err, result) {
    if(err){
      console.log(err)
      res.send("err")
    }else{
      res.send("ok")
    }
  })
}


module.exports = admin;