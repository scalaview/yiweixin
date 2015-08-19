var fs = require('fs')
var path = require('path')
var config = require("../config")
var moment = require('moment')
var _ = require('lodash')
var handlebars = require('handlebars')

function fileUpload(file, successCallBack, errorCallBack){
  var origin_this = this,
      old_path = file.path,
      file_size = file.size,
      file_type = file.type,
      origin_file_name = file.name,
      file_name = Math.round((new Date().valueOf() * Math.random())) + "_" + origin_file_name,
      new_path = path.join(process.env.PWD, config.upload_path, file_name );

  fs.readFile(old_path, function(err, data) {
      fs.writeFile(new_path, data, function(err) {
          fs.unlink(old_path, function(err) {
              if (err) {
                errorCallBack(err)
              } else {
                successCallBack(file_name)
              }
          });
      });
  });
}

function fileUploadSync(file){
  var origin_this = this,
      old_path = file.path,
      file_size = file.size,
      file_type = file.type,
      origin_file_name = file.name,
      file_name = Math.round((new Date().valueOf() * Math.random())) + "_" + _.trim(origin_file_name, ' '),
      new_path = path.join(process.env.PWD, config.upload_path, file_name );

  var tmp_file = fs.readFileSync(old_path);
  fs.writeFileSync(new_path, tmp_file);
  return file_name
}

function isExpired(expiredAt){
  if(expiredAt !== undefined && (new Date() > expiredAt)){
    return true
  }else{
    return false
  }
}


function expiredStr(expiredAt){
  if(isExpired(expiredAt)){
    return "活动已结束"
  }else{
    return
  }
}

function flowSource(obj){
  if(obj.className() === 'Order'){
    return "购买流量币"
  }else{
    return "其他来源"
  }
}

function strftime(dateTime, format){
  var result = moment()
  if(dateTime){
    result = moment(dateTime)
  }
  if( typeof format === 'string'){
    return result.format(format)
  }else{
    return result.format('YYYY-MM-DD HH:mm:ss')
  }
}

function sizeFormat(apkSize){
  if(apkSize){
    if(apkSize > 1024000){  // MB
      return _.round(apkSize/ 1000000, 2) + "MB"
    }else if(apkSize > 1000) { //KB
      return _.round(apkSize/ 1000, 2) + "KB"
    }
  }
}

function imgDiv(images){
  if(images instanceof Array){
    var length = images.length,
        source = ['<div class="col-xs-{{interval}} col-md-{{interval}}">',
          '<img class="img-responsive" src="{{img}}">',
        '</div>'].join(''),
        template = handlebars.compile(source),
        html = []

    if(length === 3){
      var interval = 4
    }else if(length === 2){
      var interval = 5
    }else{
      var interval = 12
    }

    for (var i = 0; i < images.length; i++) {
      html.push( template({ img: images[i], interval: interval }) )
    };
    return new handlebars.SafeString( html.join('') )
  }
}

function apkImages(apk) {
  var fields = ['image01', 'image02', 'image03'],
      images = []
  for (var i = 0; i < fields.length; i++) {
    if(apk[fields[i]]){
      images.push( apk[fields[i]] )
    }
  };

  return imgDiv(images)
}

function fullPath(filePath){
  return process.env.PWD + "/public" + filePath
}

function section (name, options) {
  if (!this._sections) {
    this._sections = {};
  }
  this._sections[name] = options.fn(this);
  return null;
}

exports.fileUpload = fileUpload;
exports.fileUploadSync = fileUploadSync;
exports.isExpired = isExpired;
exports.expiredStr = expiredStr;
exports.flowSource = flowSource;
exports.strftime = strftime;
exports.sizeFormat = sizeFormat;
exports.imgDiv = imgDiv;
exports.apkImages = apkImages;
exports.fullPath = fullPath;
exports.section = section
