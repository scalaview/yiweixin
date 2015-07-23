https://api.weixin.qq.com/cgi-bin/menu/create?access_token=ACCESS_TOKEN
var request = require("request")
var _ = require('lodash')

var weixinApi = {
  'create_menu': 'https://api.weixin.qq.com/cgi-bin/menu/create'
}

exports.createMenus = function (accessToken, menus, callback) {
  var options = {
    uri: weixinApi.create_menu,
    qs: {access_token: accessToken},
    method: 'POST',
    json: menus
  };

  request(options, function (error, res, data) {
    if (!error && res.statusCode == 200) {
      console.log(data.errcode == 0)
      if(data.errcode != null && data.errcode == 0){
        callback(true)
      }else{
        callback(false, data)
      }
    }else{
      console.log(error)
      callback(false, error)
    }
  });
}