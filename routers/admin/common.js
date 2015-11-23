var express = require('express');
var admin = express.Router();
var models  = require('../../models');
var formidable = require('formidable')
var helpers = require("../../helpers")
var fs        = require('fs');
var _ = require('lodash')
var async = require("async")
var config = require("../../config")

admin.use(function(req, res, next){
  res.originrender = res.render
  res.render = function(path, options, fn){
    res.originrender(path, _.merge(options, { info: req.flash('info'), err: req.flash('err') }))
  }
  next();
});

admin.use(function(req, res, next){
  helpers.compact(req.body)
  helpers.compact(req.query)
  helpers.compact(req.params)
  next();
});

admin.get('/', function (req, res) {
  res.render('admin/home');
});

admin.post('/kindeditor/uploads', function(req, res) {
  var form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, files) {
    if(err){
      res.send({ "error": 1, 'message': "server error" })
      return
    }else if(!files.imgFile.type.match('^image\/')){
      res.send({ "error": 1, 'message': "只允许上传图片" })
      return
    }else if(files.imgFile.size > config.maxfileuploadsize){
      res.send({ "error": 1, 'message': "超出最大文件限制" })
      return
    }
    var staticpath = '/public'
        dirpath = '/kindeditor/uploads',
        filename = helpers.fileUploadSync(files.imgFile, staticpath + dirpath),
        info = {
            "error": 0,
            "url": dirpath + "/" + filename
        };
    res.send(info)
  })
})

admin.post('/homeimage/uploads', function(req, res) {

  var form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, files) {
    if(err){
      res.send({ "error": 1, 'message': "server error" })
      return
    }else if(!files.adimage.type.match('^image\/')){
      res.send({ "error": 1, 'message': "只允许上传图片" })
      return
    }else if(files.adimage.size > config.maxfileuploadsize){
      res.send({ "error": 1, 'message': "超出最大文件限制" })
      return
    }
    var staticpath = '/public'
        dirpath = '/uploads'
        files.adimage.name = "banner.png"
        filename = helpers.fileUploadSync(files.adimage, staticpath + dirpath, true),
        info = {
            "error": 0,
            "url": dirpath + "/" + filename
        };
    res.redirect("/admin")
  })
})

admin.get('/kindeditor/filemanager', function (req, res) {
  var dirpath = '/kindeditor/uploads',
      fspath = path.join(process.env.PWD, '/public' + dirpath),
      files = []
  fsss = fs.readdirSync(path.join(process.env.PWD, '/public' + dirpath))
    .filter(function(file) {
      return (file.indexOf('.') !== 0) && (file.match(/(\.image$|\.png$|\.gif$|\.jpg$)/i))
    })
    .forEach(function(file) {
      var refile = fs.statSync(fspath + '/' + file)
          splitd = file.split('.'),
          type = splitd[splitd.length - 1]

      files.push({
        is_dir: false,
        has_file: false,
        filesize: refile.size,
        dir_path: "",
        is_photo: true,
        filetype: type,
        filename: file,
        datetime: helpers.strftime(refile.birthtime)
      })
    })

    res.json({ moveup_dir_path: "",
        current_dir_path: dirpath,
        current_url: dirpath + '/',
        total_count:5,
        file_list: files
      })
})


admin.get('/syncdata', function(req, res) {

  var generateName = function(string, defaultName){
    var y = /[M|G]/,
        t = /\b/,
        start = t.exec(string),
        end = y.exec(string)
    if(start.index >= 0 && end.index + 1 > start.index && end.index + 1 <= string.length){
      return string.substring(start.index, end.index + 1)
    }else{
      return defaultName
    }
  }

  var getProviderId = function(spid){
    switch(spid){
      case 1:
        return models.TrafficPlan.Provider['中国电信']
        break;
      case 3:
        return models.TrafficPlan.Provider['中国联通']
        break;
      default:
        return models.TrafficPlan.Provider['中国移动']
    }
  }

  var numbers = ['13826549803', '18144889889', '13100000099']
  async.map(numbers, function(number, pass) {
    async.waterfall([function(next) {
      models.TrafficPlan.syncDataSource(number).then(function(response, data) {
        if(data.status && data.status == -100){
          var plans = []
          try{
            plans = JSON.parse(data.data)
            next(null, plans)
          }catch(e){
            next(e)
          }
        }else{
          next(new Error(data.msg))
        }
      }).catch(function(err) {
        next(err)
      }).do()
    }, function(plans, next) {
      var map = {},
          t = /\b/

      for (var i = 0; i < plans.length; i++) {
        start = t.exec(plans[i].name)
        name = plans[i].name.substring(0, start.index)
        map[name] = plans[i].spid
      };
      var keys = Object.keys(map),
          prepareData = []

      for (var i = 0; i < keys.length; i++) {
        prepareData.push({name: keys[i], spid: map[keys[i]] })
      };
      async.map(prepareData, function(plan, innerNext) {
          models.TrafficGroup.findOrCreate({
            where: {
              name: plan.name,
              providerId: getProviderId(plan.spid)
            }
          }).spread(function(trafficgroup) {
              innerNext(null, trafficgroup)
          })
      }, function(err) {
        next(null, plans)
      })
    }, function(plans, outnext){
      async.map(plans, function(plan, next) {
        async.waterfall([function(innerNext){
          var t = /\b/,
            start = t.exec(plan.name)
            name = plan.name.substring(0, start.index)

          models.TrafficGroup.findOne({
            where: {
              name: name,
              providerId: getProviderId(plan.spid)
            }
          }).then(function(trafficgroup) {
              innerNext(null, trafficgroup)
          })
        }, function(trafficgroup, innerNext) {
          models.TrafficPlan.findOne({
            where: {
              bid: plan.bid
            }
          }).then(function(trafficplan) {
            if(!trafficplan || req.query.force){
              var providerId = getProviderId(plan.spid)
              if( req.query.force === '1' ){
                var name = plan.name
              }else{
                var name = generateName(plan.name ,plan.size + "M")
              }
              if(trafficplan){
                trafficplan.updateAttributes({
                  value: plan.size,
                  name: name,
                  trafficGroupId :trafficgroup.id
                })
              }else{
                models.TrafficPlan.build({
                  type: 1, // 正式
                  bid: plan.bid,
                  value: plan.size,
                  name: generateName(plan.name ,plan.size + "M"),
                  providerId: providerId,
                  cost: plan.price * 100,
                  display: true,
                  trafficGroupId :trafficgroup.id
                }).save()
              }
            }
          })
          innerNext(null)
        }], function(err) {
          next(null)
        })
      }, function(err) {
        if(err){
          outnext(err)
        }else{
          outnext(null)
        }
      })
    }], function(err){
      if(err){
        console.log(err)
      }
      pass(null)
    })
  }, function(err){
    res.send('ok')
  })
})

module.exports = admin;