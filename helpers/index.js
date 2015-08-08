var fs = require('fs')
var path = require('path')
var config = require("../config")

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
      file_name = Math.round((new Date().valueOf() * Math.random())) + "_" + origin_file_name,
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


exports.fileUpload = fileUpload;
exports.fileUploadSync = fileUploadSync;
exports.isExpired = isExpired;
exports.expiredStr = expiredStr;
