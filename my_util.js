var config = require("./config")
var request = require("request")
var _ = require('lodash');

var weixinApi = {
  'get_access_token': 'https://api.weixin.qq.com/cgi-bin/token'
}

exports.addQueryParams = function(url, params){
  var subfix = []
  _.forEach(params, function(n, key) {
    subfix.push(key+"="+n)
  });
  return subfix.length > 0 ? (url + "?" + subfix.join("&")) : url
}

exports.getAccessToken = function(callback){
  var options = {
    'grant_type': 'client_credential',
    'appid': config.appId,
    'secret': config.appSecret
  }

  request.get({url:weixinApi.get_access_token, qs:options, json:true}, function (error, res, data){
          if(data.errcode){
            var accessToken = new AccessToken(data)
          }else{
            var accessToken = new AccessToken(data.access_token, data.expires_in)
          }
          callback(accessToken)
        }).on("error", function(error){
          console.log(error)
        })
}

function AccessToken(access_token, expires_in){
  if(arguments.length == 2){
    this.accessToken = access_token
    this.expiresIn = expires_in
    this.createdAt = new Date()
  }else if(arguments.length == 1){
    this.errorcode = arguments[0]
  }
}

AccessToken.prototype.isExpired = function(){
  return new Date() > new Date(this.createdAt.getTime() + this.expiresIn * 1000)
}