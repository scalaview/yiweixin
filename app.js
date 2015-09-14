var express = require('express')
var config = require("./config")
var myUtil = require("./my_util")
var menu = require("./menu")
var sign = require("./sign")
var bodyParser = require('body-parser')
var jsonParser = bodyParser.json()
var urlencodedParser = bodyParser.urlencoded({ extended: false })
var async = require("async")
var parseString = require('xml2js').parseString;
var accessToken = null
var wechat = require('wechat')
var flash = require('connect-flash');
var cookieParser = require('cookie-parser')
var session = require('express-session')
var _ = require('lodash')
var formidable = require('formidable')
var fs = require('fs')
var path = require('path')
var helpers = require("./helpers")
var moment = require('moment')
var fs        = require('fs');
var app = express();
var admin = express();
var OAuth = require('wechat-oauth');
var handlebars = require('express-handlebars').create({
  defaultLayout: 'main',
  helpers: helpers
});
var Payment = require('wechat-pay').Payment;
var initConfig = {
  partnerKey: config.partnerKey,
  appId: config.appId,
  mchId: config.mchId,
  notifyUrl: "http://yiliuliang.net/paymentconfirm",
  pfx: fs.readFileSync(process.env.PWD + '/cert/apiclient_cert.p12')
};
var payment = new Payment(initConfig);

app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');

app.set('port', process.env.PORT || 3000);
app.enable('verbose errors');
app.use(express.static(__dirname + '/public'));

var wechatConfig = {
  token: config.token,
  appid: config.appId,
  encodingAESKey: config.aesKey
}

var token = function(callback){
    if(accessToken != null && !accessToken.isExpired()){
      callback()
    }else{
      myUtil.getAccessToken(function(data){
        accessToken = data
        console.log(accessToken)
        callback()
      })
    }
  }

app.use(express.query());
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
app.use(cookieParser())
app.use(urlencodedParser)
app.use(jsonParser)
app.use(session({secret: 'yiliuliang', saveUninitialized: true, resave: true}))
app.use(flash());

app.use(function(req, res, next){
  var err = req.session.error,
      msg = req.session.notice,
      success = req.session.success;

  delete req.session.error;
  delete req.session.success;
  delete req.session.notice;

  if (err) res.locals.error = err;
  if (msg) res.locals.notice = msg;
  if (success) res.locals.success = success;

  next();
});


function requireLogin(req, res, next) {
  if (req.session.customer_id) {
    models.Customer.findOne({ where: { id: req.session.customer_id } }).then(function(customer) {
      if(customer){
        req.customer = customer
        next();
      }else{
        res.redirect("/register");
      }
    }).catch(function(err){
      console.log(err)
    })
  } else {
    res.redirect("/register");
  }
}

app.use('/admin', function (req, res, next) {
  res.locals.layout = 'admin';
  next();
});

app.use('/admin', admin);

var models  = require('./models');
var router  = express.Router();

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

var skipUrls = [ '^\/wechat[\/|\?|\#]\?.*', '^\/admin\/login[\/|\?|\#]\?.*', '^\/admin\/register[\/|\?|\#]\?.*']

admin.all("*", function(req, res, next) {
  var url = req.originalUrl
  if(req.session.user_id){
    next()
    return
  }else{
    for (var i = skipUrls.length - 1; i >= 0; i--) {
      var match = req.originalUrl.match(skipUrls[i]);
      if(match !== null){
        next()
        return
      }
    };
    var encodeUrl = new Buffer(url).toString('base64');
    return res.redirect("/admin/login?to=" + encodeUrl);
  }
})

admin.get('/', function (req, res) {

  res.render('admin/home');
});

admin.get('/login', function(req, res){
  if(req.query.to){
    backTo = new Buffer(req.query.to, "base64").toString()
  }
  res.render('admin/login', { layout: 'sign', backTo: req.query.to })
})

admin.post('/login', urlencodedParser, function(req, res) {
  models.User.findOne({ where: {username: req.body.username} }).then(function(user){
    if(user && user.verifyPassword(req.body.password)){
      req.session.user_id = user.id
      if(req.body.to){
        var backTo = new Buffer(req.body.to, "base64").toString()
        res.redirect(backTo)
      }else{
        res.redirect('/admin')
      }
    }else{
      var message
      if(user){
        message = 'password error'
      }else{
        message = 'register new user'
      }
      res.render('admin/login', {
       locals: {message: message},
       layout: 'sign'
      })
    }
  })
})

admin.get('/logout', function(req, res) {
  req.session.user_id = null
  res.redirect('/admin/login')
})

admin.get('/register', function(req, res){
  res.render('admin/register', { layout: 'sign' })
})

admin.post('/register', function(req, res, next){
  var user = models.User.build({
    username: req.body.username,
    password: req.body.password
  })

  user.save().then(function(user) {
    req.session.user_id = user.id
    req.flash("info", "注册成功")
    res.redirect('/admin')
  }).catch(function(err) {
    req.flash('err', err.message)
    res.render('admin/register', {
      user: user,
      layout: 'sign'
    })
  })
})


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

admin.get('/flowtasks', function(req, res) {
  var result;
  async.waterfall([function(next) {
    var params = {}
    if(req.query.title !== undefined && req.query.title.present()){
      params = _.merge(params, { title: { $like: req.query.title } })
    }
    if(req.query.sellerId !== undefined && req.query.sellerId.present()){
      params = _.merge(params, { seller_id: req.query.sellerId })
    }
    if(req.query.isActive !== undefined && req.query.isActive.present()){
      params = _.merge(params, { isActive: req.query.isActive })
    }
    models.FlowTask.findAndCountAll({
      where: params,
      limit: req.query.perPage || 15,
      offset: helpers.offset(req.query.page, req.query.perPage || 15)
    }).then(function(flowtasks) {
      result = flowtasks
      next(null, flowtasks.rows)
    })
  }, function(flowtasks, next) {
    models.Seller.findAll({
      attributes: ['id', 'name']
    }).then(function(sellers) {
      var sellerCollection = []
      for (var i = 0; i < sellers.length; i++) {
        sellerCollection.push( [sellers[i].id, sellers[i].name] )
      };
      next(null, flowtasks, sellerCollection)
    }).catch(function(err) {
      next(err)
    })
  }], function(err, flowtasks, sellerCollection, next) {
    async.map(flowtasks, function(flowtask, mapnext) {
      async.waterfall([function(next) {
        models.Seller.findById(flowtask.seller_id).then(function(seller) {
          flowtask.seller = seller
          next(null, flowtask)
        }).catch(function(err) {
          next(err)
        })
      }, function(flowtask, next) {
        models.TrafficPlan.findById(flowtask.trafficPlanId).then(function(trafficPlan) {
          flowtask.trafficPlan = trafficPlan
          next(null, flowtask)
        }).catch(function(err) {
          next(err)
        })
      }], function(err, flowtask) {
        if(err){
          console.log(err)
          mapnext(err)
        }else{
          mapnext(null, flowtask)
        }
      })
    }, function(err, flowtasks) {
      if(err){
        console.log(err)
        req.flash('err', err.message)
        res.redirect('back')
      }else{
        var sellerOptions = { name: "sellerId", class: "col-lg-12 col-xs-12 select2", includeBlank: true },
            isActiveOptions = { name: "isActive", class:  "col-lg-12 col-xs-12 select2", includeBlank: true },
            isActiveCollection = [ [1, '激活'], [0, '冻结'] ]
        result.rows = flowtasks
        result = helpers.setPagination(result, req)
        res.render("admin/flowtasks/index", {
          flowtasks: result,
          sellerOptions: sellerOptions,
          sellerCollection: sellerCollection,
          isActiveOptions: isActiveOptions,
          isActiveCollection: isActiveCollection,
          query: req.query
        })
      }
    })
  })
})

admin.get('/flowtasks/new', function(req, res) {
  async.waterfall([function(next) {
    models.Seller.findAll().then(function(sellers) {
      next(null, sellers)
    })
  }, function(sellers, outnext) {
    models.TrafficPlan.scope('forSelect').findAll().then(function(trafficPlans) {
      if(trafficPlans){
        async.map(trafficPlans, function(trafficPlan, next){
          next(null, [trafficPlan.id, trafficPlan.name])
        }, function(err, trafficPlanCollection){
          outnext(null, sellers, trafficPlanCollection)
        })
      }else{
        outnext(new Error("no trafficPlans found"))
      }
    }).catch(function(err) {
      outnext(err)
    })
  }, function(sellers, trafficPlanCollection, outnext) {
    async.map(sellers, function(seller, next){
      next(null, [seller.id, seller.name])
    }, function(err, sellerCollection){
      outnext(null, sellerCollection, trafficPlanCollection)
    })
  }], function(err, sellerCollection, trafficPlanCollection) {
    if(err){
      console.log(err)
    }else{
      var sellerOptions = { name: 'seller_id', id: 'seller_id', class: 'select2 col-lg-12 col-xs-12' },
          trafficPlanOptions = { name: 'trafficPlanId', id: 'trafficPlanId', class: 'select2 col-lg-12 col-xs-12' }
      res.render('./admin/flowtasks/new', {
        flowtask: models.FlowTask.build(),
        sellerOptions: sellerOptions,
        sellerCollection: sellerCollection,
        trafficPlanOptions: trafficPlanOptions,
        trafficPlanCollection: trafficPlanCollection
      })
    }
  })
})

admin.get('/flowtasks/:id/edit', function(req, res) {
  async.waterfall([function(next){
    models.FlowTask.findById(req.params.id).then(function(flowtask) {
      next(null, flowtask)
    }).catch(function(err) {
      next(err)
    })
  }, function(flowtask, outnext) {
    models.Seller.findAll().then(function(sellers) {
      for (var i = sellers.length - 1; i >= 0; i--) {
        if(sellers[i].id == flowtask.seller_id){
          flowtask.seller = sellers[i]
          break;
        }
      };
      async.map(sellers, function(seller, next){
        next(null, [seller.id, seller.name])
      }, function(err, sellerCollection){
        outnext(null, flowtask, sellerCollection)
      })
    })
  }, function(flowtask, sellerCollection, outnext){
    models.TrafficPlan.scope('forSelect').findAll().then(function(trafficPlans) {
      if(trafficPlans){
        async.map(trafficPlans, function(trafficPlan, next){
          next(null, [trafficPlan.id, trafficPlan.name])
        }, function(err, trafficPlanCollection){
          outnext(null, flowtask, sellerCollection, trafficPlanCollection)
        })
      }else{
        outnext(new Error("no trafficPlans found"))
      }
    }).catch(function(err) {
      outnext(err)
    })
  }], function(err, flowtask, sellerCollection, trafficPlanCollection){
    if(err){
      console.log(err)
      res.redirect("/admin/flowtasks")
    }else{
      var sellerOptions = { name: 'seller_id', id: 'seller_id', class: 'select2 col-lg-12 col-xs-12' },
            trafficPlanOptions = { name: 'trafficPlanId', id: 'trafficPlanId', class: 'select2 col-lg-12 col-xs-12' }
      res.render('./admin/flowtasks/edit', {
        sellerOptions: sellerOptions,
        sellerCollection: sellerCollection,
        trafficPlanOptions: trafficPlanOptions,
        trafficPlanCollection: trafficPlanCollection,
        flowtask: flowtask,
        path: '/admin/flowtask/'+flowtask.id
      })
    }
  })
})

admin.post('/flowtask', function(req, res) {

  var form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, files) {
    models.FlowTask.build({
      title: fields.title,
      content: fields.content,
      expiredAt: new Date(fields.expired_at),
      isActive: fields.is_active ? 1 : 0,
      sortNum: fields.sortNum,
      cover: files.cover,
      seller_id: fields.seller_id,
      trafficPlanId: fields.trafficPlanId,
      actionUrl: fields.actionUrl
    }).save().then(function(flowtask) {
      req.flash('info', 'create success')
      res.redirect("/admin/flowtasks/" + flowtask.id + "/edit")
    }).catch(function(err) {
      console.log(err)
      req.flash("err", err.message)
      res.redirect("/admin/flowtasks/new")
    });
  });
});


admin.post("/flowtask/:id", function(req, res) {
  var form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, files) {
    async.waterfall([function(next) {
      models.FlowTask.findById(req.params.id).then(function(flowtask) {
        next(null, flowtask)
      }).catch(function(err) {
        next(err)
      })
    }, function(flowtask, next){
      if(files.cover.size > 0){
        fields['cover'] = files.cover
      }else if( fields.removeCover){
        fields['cover'] = null
      }else{
        fields['cover'] = files.cover
      }
      fields['isActive'] = fields.is_active ? 1 : 0
      fields['expiredAt'] = new Date(fields.expired_at)
      flowtask.updateAttributes(fields).then(function(flowtask) {
        next(null, flowtask)
      }).catch(function(err) {
        next(err)
      })
    }], function(err, flowtask) {
      if(err){
        console.log(err)
        req.flash('err', err.message)
        res.redirect("/admin/flowtasks/" + flowtask.id + "/edit")
      }else{
        req.flash('info', 'update success')
        res.redirect("/admin/flowtasks")
      }
    })
  })
})

admin.get('/customers', function(req, res) {
  var params = {}
  if(req.query.phone !== undefined && req.query.phone.present()){
    params = _.merge(params, { phone: { $like: "%{{phone}}%".format({ phone: req.query.phone }) } })
  }
  models.Customer.findAndCountAll({
    where: params,
    limit: req.query.perPage || 15,
    offset: helpers.offset(req.query.page, req.query.perPage || 15)
  }).then(function(customers) {
    var result = helpers.setPagination(customers, req)
    res.render('admin/customers/index', { customers: result, query: req.query })
  })
})

admin.get('/apks/new', function(req, res) {
  models.Seller.findAll().then(function(sellers) {
    if(sellers){
      async.map(sellers, function(seller, next){
        next(null, [seller.id, seller.name])
      }, function(err, sellerCollection){
        var sellerOptions = { name: 'sellerId', id: 'sellerId', class: 'select2 col-lg-12 col-xs-12' }
        res.render('admin/apks/new', {
          apk: models.Apk.build(),
          sellerCollection: sellerCollection,
          sellerOptions: sellerOptions,
          path: "/admin/apk"
        })
      })
    }
  })
})

admin.post("/apk", function(req, res) {
  var form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, files) {
    models.Apk.build({
      name: fields.name,
      isActive: fields.isActive ? 1 : 0,
      version: fields.version,
      sellerId: fields.sellerId,
      reward: fields.reward,
      apk: files.apk,
      icon: files.icon,
      image01: files.image01,
      image02: files.image02,
      image03: files.image03,
      adImage: files.adImage,
      description: fields.description,
      digest: fields.digest
    }).save().then(function(apk) {
      req.flash('info', 'create success')
      res.redirect("/admin/apks/"+apk.id+'/edit')
    }).catch(function(err, apk) {
      console.log(err)
      req.flash('err', err.message)
      res.redirect("/admin/apks/new")
    })
  })
})

admin.get("/apks", function(req, res){
  var result
  async.waterfall([function(next) {
    var params = {}
    if(req.query.name !== undefined && req.query.name.present()){
      params = _.merge(params, { name: { $like: "%{{name}}%".format({ name: req.query.name }) } })
    }
    if(req.query.sellerId !== undefined && req.query.sellerId.present()){
      params = _.merge(params, { sellerId: req.query.sellerId })
    }
    models.Apk.findAndCountAll({
        where: params,
        limit: req.query.perPage || 15,
        offset: helpers.offset(req.query.page, req.query.perPage || 15)
      }).then(function(apks) {
        result = apks
        next(null, apks.rows)
      })
  }, function(apks, outnext) {
    async.map(apks, function(apk, next){
      models.Seller.findById(apk.sellerId).then(function(seller) {
        apk.seller = seller
        next(null, apk)
      }).catch(function(err){
        next(err)
      })
    }, function(err, apks){
      if(err){
        outnext(err)
      }else{
        outnext(null, apks)
      }
    })
  },function(apks, next) {
    models.Seller.findAll({
      attributes: ['id', 'name']
    }).then(function(sellers) {
      var sellerCollection = []
      for (var i = 0; i < sellers.length; i++) {
        sellerCollection.push( [sellers[i].id, sellers[i].name] )
      };
      next(null, apks, sellerCollection)
    }).catch(function(err) {
      next(err)
    })
  }], function(err, apks, sellerCollection) {
    if(err){
      console.log(err)
      res.send(500)
    }else{
      var sellerOptions = { name: 'sellerId', class: "select2 col-lg-12 col-xs-12", includeBlank: true}
      result.rows = apks
      result = helpers.setPagination(result, req)
      res.render('admin/apks/index', {
        apks: result,
        query: req.query,
        sellerCollection: sellerCollection,
        sellerOptions: sellerOptions
      })

    }
  })
})

admin.get("/apks/:id/edit", function(req, res) {
  async.waterfall([function(next) {
    models.Apk.findById(req.params.id).then(function(apk) {
      next(null, apk)
    }).catch(function(err) {
      next(err)
    })
  }, function(apk, outnext) {
    models.Seller.findAll().then(function(sellers) {
      async.map(sellers, function(seller, next){
        next(null, [seller.id, seller.name])
      }, function(err, sellerCollection){
        outnext(null, apk, sellerCollection)
      })
    })
  }], function(err, apk, sellerCollection) {
    if(err){
      console.log(err)
      req.flash('err', err.message)
      res.redirect("/admin/apks")
    }else{
      var sellerOptions = { name: 'sellerId', id: 'sellerId', class: 'select2 col-lg-12 col-xs-12' },
          trafficPlanOptions = { name: 'trafficPlanId', id: 'trafficPlanId', class: 'select2 col-lg-12 col-xs-12' }

      res.render('admin/apks/edit', {
        sellerOptions: sellerOptions,
        sellerCollection: sellerCollection,
        apk: apk,
        path: '/admin/apk/'+apk.id
      })
    }
  })
})


admin.post("/apk/:id", function(req, res) {
  var form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, files) {
    async.waterfall([function(next) {
      models.Apk.findById(req.params.id).then(function(apk) {
        next(null, apk)
      }).catch(function(err) {
        next(err)
      })
    }, function(apk, next){
      var list = ['Icon', 'Apk', 'Image01', 'Image02', 'Image03', 'Adimage']
      for (var i = 0; i < list.length; i++) {
        if(files[list[i].toLowerCase()].size > 0 ){
          fields[list[i].toLowerCase()] = files[list[i].toLowerCase()]
        }else if(fields['remove' + list[i]]){
          fields[list[i].toLowerCase()] = null
        }else{
          fields[list[i].toLowerCase()] = files[list[i].toLowerCase()]
        }
      };
      fields['isActive'] = fields.isActive ? 1 : 0
      apk.updateAttributes(fields).then(function(apk) {
        next(null, apk)
      }).catch(function(err) {
        next(err)
      })
    }], function(err, apk) {
      if(err){
        console.log(err)
        req.flash('err', err.message)
        res.redirect("/admin/apk/" + apk.id + "/edit")
      }else{
        req.flash('info', 'update success')
        res.redirect("/admin/apks")
      }
    })
  })
})


admin.get("/apk/:id/delete", function(req, res) {
  models.Apk.findById(req.params.id).then(function(apk) {
    apk.destroy().then(function() {
      res.redirect('/admin/apks')
    })
  })
})

// -----------------customer ------------------
admin.get("/customers/:id", function(req, res) {
  async.waterfall([function(next) {
    models.Customer.findById(req.params.id).then(function(customer) {
      if(customer){
        next(null, customer)
      }else{
        res.send(404)
      }
    }).catch(function(err) {
      next(err)
    })
  }, function(customer, next){
    models.Level.findAll().then(function(levels) {
      var levelCollection = []
        for (var i = 0; i < levels.length; i++) {
          levelCollection.push([ levels[i].id, levels[i].name ])
          if(customer.levelId != undefined && levels[i].id === customer.levelId){
            customer.level = levels[i]
          }
        };

      next(null, customer, levelCollection)
    }).catch(function(err) {
      next(err)
    })
  }], function(err, customer, levelCollection) {
    if(err){
      console.log(err)
      res.send(500)
    }else{
      var levelOptions = { name: 'levelId', class: 'select2 col-xs-12 col-lg-12' }
      res.render("admin/customers/show", {
          customer: customer,
          levelCollection: levelCollection,
          levelOptions: levelOptions
        })
    }
  })

})

admin.post("/customer/:id", function(req, res) {
  async.waterfall([function(next) {
    models.Customer.findById(req.params.id).then(function(customer) {
      if(customer){
        next(null, customer)
      }else{
        next(new Error("not found"))
      }
    }).catch(function(err) {
      next(err)
    })
  }, function(customer, next) {
    customer.updateAttributes({
      levelId: req.body.levelId
    }).then(function(customer) {
      next(null, customer)
    }).catch(function(err) {
      next(err)
    })
  }], function(err, customer) {
    if(err){
      console.log(err)
      res.redirect('/500')
    }else{
      req.flash('info', "update success")
      res.redirect('/admin/customers/' + customer.id)
    }
  })
})

// ============ coupon=================================

admin.get("/coupons", function(req, res) {
  async.waterfall([function(next) {
    models.DataPlan.findAll().then(function(dataPlans) {
      next(null, dataPlans)
    }).catch(function(err) {
      next(err)
    })
  }, function(dataPlans, next){
    models.Coupon.findAndCountAll().then(function(result) {
      var coupons = result.rows
      for (var i = coupons.length - 1; i >= 0; i--) {
        for (var j = dataPlans.length - 1; j >= 0; j--) {
          if(dataPlans[j].id == coupons[i].dataPlanId){
            coupons[i].dataPlan = dataPlans[j]
          }
        };
      };
      next(null, dataPlans, result)
    }).catch(function(err) {
      next(err)
    })
  }], function(err, dataPlans, result) {
    if(err){
      console.log(err)
    }else{
      result = helpers.setPagination(result, req)
      res.render("admin/coupons/index", {
        coupons: result
      })
    }
  })
})


admin.get('/coupons/new', function(req, res) {
  async.waterfall([function(next){
    models.DataPlan.findAll().then(function(dataPlans){
      var dataPlanCollection = []
      for (var i = 0; i < dataPlans.length; i++ ) {
        dataPlanCollection.push([dataPlans[i].id, dataPlans[i].name])
      };
      next(null, dataPlanCollection)
    }).catch(function(err) {
      next(err)
    })
  }], function(err, dataPlanCollection) {
    var coupon = models.Coupon.build(),
        dataPlanOptions = { name: 'dataPlanId', class: "select2 col-lg-12 col-xs-12" }
    res.render('admin/coupons/new', {
      coupon: coupon,
      dataPlanOptions: dataPlanOptions,
      dataPlanCollection: dataPlanCollection,
      path: "/admin/coupon"
    })
  })
})



admin.post('/coupon', function(req, res) {
  var params = req.body
  params['isActive'] = params['isActive'] === 'on'
  params['ignoreLevel'] = params['ignoreLevel'] === 'on'
  models.Coupon.build(params).save().then(function(coupon) {
    if(coupon.id){
      req.flash('info', "create success")
      res.redirect('/admin/coupons/' + coupon.id + '/edit')
    }
  }).catch(function(err) {
    console.log(err)
    req.flash('err', "create fails")
    res.redirect('/admin/coupons/new')
  })
})

admin.get('/coupons/:id/edit', function(req, res) {
  async.waterfall([function(next) {
    models.Coupon.findById(req.params.id).then(function(coupon) {
      next(null, coupon)
    }).catch(function(err) {
      next(err)
    })
  }, function(coupon, next){
    models.DataPlan.findAll().then(function(dataPlans){
      var dataPlanCollection = []
      for (var i = 0; i < dataPlans.length; i++ ) {
        if(dataPlans[i].id  === coupon.dataPlanId){
          coupon.dataPlan = dataPlans[i]
        }
        dataPlanCollection.push([dataPlans[i].id, dataPlans[i].name])
      };
      next(null, coupon, dataPlanCollection)
    }).catch(function(err) {
      next(err)
    })
  }], function(err, coupon, dataPlanCollection) {
    if(err){
      console.log(err)
      res.redirect('/500')
    }else{
      var dataPlanOptions = { name: 'dataPlanId', class: "select2 col-lg-12 col-xs-12" }
      res.render('admin/coupons/edit', {
        coupon: coupon,
        dataPlanOptions: dataPlanOptions,
        dataPlanCollection: dataPlanCollection,
        path: "/admin/coupons/" + coupon.id + '/edit'
      })
    }
  })
})

admin.post('/coupons/:id', function(req, res) {
  var params = req.body
  params['isActive'] = params['isActive'] === 'on'
  params['ignoreLevel'] = params['ignoreLevel'] === 'on'
  async.waterfall([function(next) {
    models.Coupon.findById(req.params.id).then(function(coupon) {
      next(null, coupon)
    }).catch(function(err) {
      next(err)
    })
  }, function(coupon, next) {
    coupon.updateAttributes(params).then(function(coupon) {
      next(null, coupon)
    }).catch(function(err) {
      next(err)
    })
  }], function(err, coupon) {
    if(err){
      console.log(err)
      req.flash('err', "update fails")
    }else{
      req.flash('info', "update success")
    }
    res.redirect('/admin/coupons/' + coupon.id + '/edit')
  })
})


// ============ coupon=================================

admin.get("/flowhistories", function(req, res){
  var result;
  async.waterfall([function(next) {
    var params = {}
    if(req.query.customerId !== undefined && req.query.customerId.present()){
      params = _.merge(params, { customerId: req.query.customerId })
    }
    if(req.query.type !== undefined && req.query.type.present()){
      params = _.merge(params, { type: req.query.type })
    }
    if(req.query.typeId !== undefined && req.query.typeId.present()){
      params = _.merge(params, { typeId: req.query.typeId.toI() })
    }
    if(req.query.state !== undefined && req.query.state.present()){
      params = _.merge(params, { state: req.query.state })
    }
    models.FlowHistory.findAndCountAll({
      where: params,
      limit: req.query.perPage || 15,
      offset: helpers.offset(req.query.page, req.query.perPage || 15),
      order: [
        ['createdAt', 'DESC']
      ]
    }).then(function(flowhistories){
      result = flowhistories
      next(null, flowhistories.rows)
    })
  }, function(flowhistories, outnext) {
    async.map(flowhistories, function(flowHistory, next) {
      flowHistory.getCustomer().then(function(customer) {
        flowHistory.customer = customer
        next(null, flowHistory)
      }).catch(function(err) {
        next(err)
      })
    }, function(err, flowhistories) {
      if(err){
        outnext(err)
      }else{
        outnext(null, flowhistories)
      }
    })
  }, function(flowhistories, outnext) {
    async.map(flowhistories, function(flowHistory, next) {
      flowHistory.getSource().then(function(source) {

        if(source){
          switch(source.className()){
            case "Order":
              flowHistory.order = source
              break;
            case "ExtractOrder":
              flowHistory.extractOrder = source
              break;
            case "Apk":
              flowHistory.apk = source
              break;
          }
          next(null, flowHistory)
        }
      }).catch(function(err) {
        next(err)
      })
    }, function(err, flowhistories) {
      if(err){
        outnext(err)
      }else{
        outnext(null, flowhistories)
      }
    })
  }, function(flowhistories, next){
    models.Customer.findAll({
      attributes: ["id", "phone"]
    }).then(function(customers) {
      var customerCollection = []
      for (var i = 0; i < customers.length; i++) {
        customerCollection.push( [customers[i].id, customers[i].phone] )
      };
      next(null, flowhistories, customerCollection)
    }).catch(function(err) {
      next(err)
    })
  }], function(err, flowhistories, customerCollection) {
    if(err){
      console.log(err)
      res.send(500)
    }else{
      var customerOptions = { name: 'customerId', class: "select2 col-lg-12 col-xs-12", includeBlank: true },
          stateOptions = { name: 'state', class: 'select2 col-xs-12 col-lg-12', includeBlank: true },
          stateCollection = [ [models.FlowHistory.STATE.ADD, "增加"], [models.FlowHistory.STATE.REDUCE, "减少"] ],
          typeOptions = { name: 'type', class: 'select2 col-xs-12 col-lg-12', includeBlank: true },
          typeCollection = [ ["Order", "充值流量币"], ["ExtractOrder", "提取流量"] ]

      result.rows = flowhistories
      result = helpers.setPagination(result, req)
      res.render('admin/flowhistories/index', {
        flowhistories: result,
        query: req.query,
        customerCollection: customerCollection,
        customerOptions: customerOptions,
        stateCollection: stateCollection,
        stateOptions: stateOptions,
        typeCollection: typeCollection,
        typeOptions: typeOptions
      })
    }
  })
})

// ---------------------customer--------------


admin.get("/extractorders", function(req, res) {
  var result;
  async.waterfall([function(next) {
    var params = {}
    if(req.query.phone !== undefined && req.query.phone.present()){
      params = _.merge(params, { phone: { $like: "%{{phone}}%".format({ phone: req.query.phone }) } })
    }
    if(req.query.state !== undefined && req.query.state.present()){
      params = _.merge(params, { state: req.query.state })
    }
    if(req.query.exchangerType !== undefined && req.query.exchangerType.present()){
      params = _.merge(params, { exchangerType: req.query.exchangerType })
    }
    models.ExtractOrder.findAndCountAll({
      where: params,
      limit: req.query.perPage || 15,
      offset: helpers.offset(req.query.page, req.query.perPage || 15)
    }).then(function(extractOrders) {
      result = extractOrders
      next(null, extractOrders.rows)
    }).catch(function(err) {
      next(err)
    })
  }, function(extractOrders, outnext) {
    var i = 0
    async.map(extractOrders, function(extractOrder, next) {
      i = i + 1
      extractOrder.getExchanger().then(function(exchanger){
        extractOrder.exchanger = exchanger
        if(exchanger.className() === "TrafficPlan"){
          extractOrder.trafficPlan = exchanger
        }else if(exchanger.className() === "FlowTask"){
          extractOrder.flowtask = exchanger
        }
        next(null, extractOrder)
      }).catch(function(err) {
        next(err)
      })
    }, function(err, extractOrders){
      if(err){
        outnext(err)
      }else{
        outnext(null, extractOrders)
      }
    })
  }], function(err, extractOrders) {
    if(err){
      console.log(err)
      res.send(500)
    }else{
      var stateOptions = { name: 'state', class: "select2 col-lg-12 col-xs-12", includeBlank: true },
          stateCollection = [],
          exchangerTypeOptions = { name: 'exchangerType', class: "select2 col-lg-12 col-xs-12", includeBlank: true },
          exchangerTypeCollection = [ [ 'TrafficPlan', '充值' ], [ 'FlowTask', '流量任务' ] ]

      for (var key in models.ExtractOrder.STATE) {
        stateCollection.push([models.ExtractOrder.STATE[key] , key])
      };

      result.rows = extractOrders
      result = helpers.setPagination(result, req)
      res.render('admin/extractorders/index', {
        extractOrders: result,
        query: req.query,
        stateOptions: stateOptions,
        stateCollection: stateCollection,
        exchangerTypeOptions: exchangerTypeOptions,
        exchangerTypeCollection: exchangerTypeCollection
      })
    }
  })
})


admin.get("/extractorders/new", function(req, res) {
  async.waterfall([function(next){
    models.TrafficPlan.scope("forSelect").findAll().then(function(trafficPlans) {
      next(null, trafficPlans)
    }).catch(function(err) {
      next(err)
    })
  }, function(trafficPlans, outnext) {
    async.map(trafficPlans, function(trafficPlan, next) {
      next(null, [trafficPlan.id, trafficPlan.name])
    }, function(err, trafficPlanCollection) {
      outnext(null, trafficPlanCollection)
    })
  }], function(err, trafficPlanCollection) {
    var extractOrder = models.ExtractOrder.build({}),
        trafficPlanOptions = { name: 'trafficPlanId', id: 'trafficPlanId', class: 'select2 col-lg-12 col-xs-12' }
    res.render("admin/extractorders/new", {
      extractOrder: extractOrder,
      trafficPlanOptions: trafficPlanOptions,
      trafficPlanCollection: trafficPlanCollection,
      path: '/admin/extractorder'
    })
  })
})

admin.post("/extractorder", function(req, res) {
  if(!( req.body.phone !== undefined && req.body.phone.present() && req.body.trafficPlanId !== undefined &&  req.body.trafficPlanId.present() )){
    res.redirect("/admin/extractorders/new")
    return
  }
  async.waterfall([function(next) {
    models.TrafficPlan.findById(req.body.trafficPlanId).then(function(trafficPlan) {
      if(trafficPlan){
        next(null, trafficPlan)
      }else{
        next(new Error("请选择正确的流量包"))
      }
    }).catch(function(err) {
      next(err)
    })
  }, function(trafficPlan, next){
    models.ExtractOrder.build({
      exchangerType: trafficPlan.className(),
      exchangerId: trafficPlan.id,
      phone: req.body.phone,
      cost: req.body.cost,
      value: trafficPlan.value,
      extend: req.body.extend
    }).save().then(function(extractOrder) {
      next(null, extractOrder)
    }).catch(function(err) {
      next(err)
    })
  }], function(err, extractOrder) {
    if(err){
      console.log(err)
      req.flash('err', err.message)
      res.redirect("/admin/extractorders/new")
    }else{
      req.flash('info', "create success")
      res.redirect("/admin/extractorders/" + extractOrder.id + "/edit")
    }
  })

})


admin.get("/extractorders/:id/edit", function(req, res){
  async.waterfall([function(next) {
    models.ExtractOrder.findById(req.params.id).then(function(extractOrder) {
      next(null, extractOrder)
    }).catch(function(err){
      next(err)
    })
  }, function(extractOrder, next){
    if(extractOrder.exchangerType === "TrafficPlan"){
      models.TrafficPlan.scope("forSelect").findAll().then(function(trafficPlans) {
        next(null, extractOrder, trafficPlans)
      }).catch(function(err) {
        next(err)
      })
    }else{
      extractOrder.getExchanger().then(function(flowtask){
        extractOrder.flowtask = flowtask
        next(null, extractOrder, null)
      })
    }
  }, function(extractOrder, trafficPlans, outnext) {
    if(trafficPlans === null){
      outnext(null, extractOrder, null)
    }
    async.map(trafficPlans, function(trafficPlan, next) {
      next(null, [trafficPlan.id, trafficPlan.name])
    }, function(err, trafficPlanCollection) {
      outnext(null, extractOrder, trafficPlanCollection)
    })
  }], function(err, extractOrder, trafficPlanCollection) {
    var trafficPlanOptions = { name: 'trafficPlanId', id: 'trafficPlanId', class: 'select2 col-lg-12 col-xs-12' }
    res.render("admin/extractorders/edit", {
      extractOrder: extractOrder,
      trafficPlanOptions: trafficPlanOptions,
      trafficPlanCollection: trafficPlanCollection,
      path: '/admin/extractOrder/'+extractOrder.id
    })
  })
})



admin.post("/extractorder/:id", function(req, res) {
  if(!( req.body.phone !== undefined && req.body.phone.present() && req.body.trafficPlanId !== undefined &&  req.body.trafficPlanId.present() )){
    res.redirect("/admin/extractorders/" + req.params.id + "/edit")
    return
  }
  async.waterfall([function(next) {
    models.ExtractOrder.findById(req.params.id).then(function(extractOrder) {
      next(null, extractOrder)
    }).catch(function(err){
      next(err)
    })
  }, function(extractOrder, next) {
    models.TrafficPlan.findById(req.body.trafficPlanId).then(function(trafficPlan) {
      if(trafficPlan){
        next(null, extractOrder, trafficPlan)
      }else{
        next(new Error("请选择正确的流量包"))
      }
    }).catch(function(err) {
      next(err)
    })
  }, function(extractOrder, trafficPlan, next){
    extractOrder.updateAttributes({
      exchangerId: trafficPlan.id,
      phone: req.body.phone,
      cost: req.body.cost,
      value: trafficPlan.value,
      extend: req.body.extend
    }).then(function(extractOrder) {
      next(null, extractOrder)
    }).catch(function(err) {
      next(err)
    })
  }], function(err, extractOrder) {
    if(err){
      console.log(err)
      req.flash('err', err.message)
    }else{
      req.flash('info', 'update success')
    }
    res.redirect("/admin/extractorders/" + extractOrder.id + "/edit")

  })

})

// --------------------seller-----------------------

admin.get("/sellers", function(req, res) {
  var params = {}
  if(req.query.name !== undefined && req.query.name.present()){
    params = _.merge(params, { name: { $like: "%{{name}}%".format({ name: req.query.name }) } })
  }
  models.Seller.findAndCountAll({
    where: params,
    limit: req.query.perPage || 15,
    offset: helpers.offset(req.query.page, req.query.perPage || 15)
  }).then(function(sellers) {
    sellers = helpers.setPagination(sellers, req)
    res.render("admin/sellers/index", { sellers: sellers, query: req.query })
  })
})


admin.get("/sellers/:id/edit", function(req, res) {
  models.Seller.findById(req.params.id).then(function(seller) {
    res.render("admin/sellers/edit", { seller: seller, path: "/admin/seller/" + seller.id })
  })
})

admin.get("/sellers/new", function(req, res) {
  var seller = models.Seller.build()

  res.render("admin/sellers/new", { seller: seller, path: "/admin/seller" })
})

admin.post("/seller", function(req, res) {
  var seller = models.Seller.build(req.body)
  seller.generatAccessToken()
  seller.save().then(function(seller) {
    res.redirect("/admin/sellers/"+ seller.id +"/edit")
  }).catch(function(err){
    if(err){
      console.log(err)
      req.flash('err', err.message)
    }else{
      req.flash('info', "create success")
    }
    res.render("admin/sellers/new", { seller: seller, path: "/admin/seller" })
  })
})

admin.post("/seller/:id", function(req, res) {

  async.waterfall([function(next) {
    models.Seller.findById(req.params.id).then(function(seller) {
      next(null, seller)
    })
  }, function(seller, next) {
    seller.updateAttributes(req.body).then(function(seller) {
      next(null, seller)
    }).catch(function(err) {
      next(err)
    })
  }], function(err, seller) {
    if(err){
      console.log(err)
      req.flash("err", err.message)
      res.render("admin/sellers/edit", { seller: seller, path: "/admin/seller/" + seller.id })
    }else{
      req.flash("info", "update success")
      res.redirect("/admin/sellers/{{id}}/edit".format({ id: seller.id }))
    }
  })

})


admin.get("/sellers/:id/reset", function(req, res){
  async.waterfall([function(next) {
    models.Seller.findById(req.params.id).then(function(seller) {
      seller.generatAccessToken()
      seller.save().then(function(seller){
        next(null, seller)
      })
    }).catch(function(err){
      next(err)
    })
  }], function(err, seller){
    if(err){
      console.log(err)
      res.json({ err: 1, msg: "重置token出错"})
    }else{
      res.json({ err: 0, msg: "重置token成功", token: seller.accessToken })
    }
  })
})

// --------------------seller-----------------------


// ------------------orders------------------------

admin.get("/orders", function(req, res) {
  var result,
      paymentMethodCollection = [],
      dataPlanCollection = []
  async.waterfall([function(next) {
    var params = {}
    if(req.query.phone !== undefined && req.query.phone.present()){
      params = _.merge(params, { phone: { $like: "%{{phone}}%".format({ phone: req.query.phone }) } })
    }
    if(req.query.state !== undefined && req.query.state.present()){
      params = _.merge(params, { state: req.query.state } )
    }
    if(req.query.dataPlanId !== undefined && req.query.dataPlanId.present()){
      params = _.merge(params, { dataPlanId: req.query.dataPlanId } )
    }
    if(req.query.paymentMethodId !== undefined && req.query.paymentMethodId.present()){
      params = _.merge(params, { paymentMethodId: req.query.paymentMethodId } )
    }
    models.Order.findAndCountAll({
      where: params,
      limit: req.query.perPage || 15,
      offset: helpers.offset(req.query.page, req.query.perPage || 15)
    }).then(function(orders){
      result = orders
      next(null, orders.rows)
    }).catch(function(err){
      next(err)
    })
  }, function(orders, next) {
    models.PaymentMethod.findAll().then(function(paymentMethods) {
      for (var i = 0; i < paymentMethods.length; i++) {
        paymentMethodCollection.push([paymentMethods[i].id, paymentMethods[i].name])
      };
      next(null, orders, paymentMethods)
    }).catch(function(err) {
      next(err)
    })
  }, function(orders, paymentMethods, outnext){
    async.map(orders, function(order, next) {
      for (var i = paymentMethods.length - 1; i >= 0; i--) {

        if(paymentMethods[i].id == order.paymentMethodId){
          order.paymentMethod = paymentMethods[i]
          break;
        }
      };
      next(null, order)
    }, function(err, orders){
      if(err){
        outnext(err)
      }else{
        outnext(null, orders)
      }
    })
  }, function(orders, next){
    models.DataPlan.findAll().then(function(dataPlans) {
      for (var i = 0; i < dataPlans.length; i++) {
        dataPlanCollection.push([dataPlans[i].id, dataPlans[i].name])
      };
      next(null, orders, dataPlans)
    })
  }, function(orders, dataPlans, outnext) {
    async.map(orders, function(order, next) {
      for (var i = dataPlans.length - 1; i >= 0; i--) {
        if(dataPlans[i].id == order.dataPlanId){
          order.dataPlan = dataPlans[i]
          break;
        }
      };
      next(null, order)
    }, function(err, orders) {
      if(err){
        outnext(err)
      }else{
        outnext(null, orders)
      }
    })
  }, function(orders, outnext) {
    async.map(orders, function(order, next){
      models.Customer.findById(order.customerId).then(function(customer) {
        order.customer = customer
        next(null, order)
      }).catch(function(err){
        next(err)
      })
    }, function(err, orders) {
      if(err){
        outnext(err)
      }else{
        outnext(null, orders)
      }
    })
  }], function(err, orders) {
    if(err){
      console.log(err)
      res.send(500)
    }else{
      var dataPlanOptions = { name: 'dataPlanId', id: 'dataPlanId', class: 'select2 col-lg-12 col-xs-12', includeBlank: true },
          paymentMethodOptions = { name: 'paymentMethodId', id: 'paymentMethodId', class: 'select2 col-lg-12 col-xs-12', includeBlank: true },
          stateOptions = { name: 'state', id: 'state', class: 'select2 col-lg-12 col-xs-12', includeBlank: true },
          stateCollection = []

      for(var key in models.Order.STATE){
        stateCollection.push([ models.Order.STATE[key], key ])
      }
      result.rows = orders
      result = helpers.setPagination(result, req)
      res.render("admin/orders/index", {
        orders: result,
        dataPlanCollection: dataPlanCollection,
        paymentMethodCollection: paymentMethodCollection,
        dataPlanOptions: dataPlanOptions,
        paymentMethodOptions: paymentMethodOptions,
        stateOptions: stateOptions,
        stateCollection: stateCollection,
        query: req.query
      })
    }
  })
})


admin.get("/orders/:id", function(req, res) {
  async.waterfall([function(next) {
    models.Order.findById(req.params.id).then(function(order) {
      next(null, order)
    }).catch(function(err) {
      next(err)
    })
  }, function(order, next) {
    models.Customer.findById(order.customerId).then(function(customer) {
      order.customer = customer
      next(null, order)
    }).catch(function(err){
      next(err)
    })
  }, function(order, next) {
    models.DataPlan.findById(order.dataPlanId).then(function(dataPlan) {
      order.dataPlan = dataPlan
      next(null, order)
    }).catch(function(err) {
      next(err)
    })
  }, function(order, next) {
    models.PaymentMethod.findById(order.paymentMethodId).then(function(paymentMethod) {
      order.paymentMethod = paymentMethod
      next(null, order)
    }).catch(function(err) {
      next(err)
    })
  }], function(err, order){
    if(err){
      console.log(err)
    }else{
      res.render("admin/orders/show", { order: order })
    }
  })
})

// ------------------orders------------------------


admin.get("/messagequeues", function(req, res) {
  var params = {};
  if(req.query.phone !== undefined && req.query.phone.present()){
    params = _.merge(params, { phone: { $like: "%{{phone}}%".format({ phone: req.query.phone }) } } )
  }
  if(req.query.type !== undefined && req.query.type.present()){
    params = _.merge(params, { type: req.query.type })
  }
  if(req.query.state !== undefined && req.query.state.present()){
    params = _.merge(params, { state: req.query.state })
  }
  models.MessageQueue.findAndCountAll({
    where: params,
    limit: req.query.perPage || 15,
    offset: helpers.offset(req.query.page, req.query.perPage || 15),
    order: [
      ['updatedAt', 'DESC']
    ]
  }).then(function(messageQueues) {
    var messagequeues = helpers.setPagination(messageQueues, req),
        messageTypeOptions = { name: "type", class: 'select2 col-lg-12 col-xs-12', includeBlank: true },
        stateTypeOptions = { name: "state", class: 'select2 col-lg-12 col-xs-12', includeBlank: true }
        messageTypeCollections = [],
        stateTypeCollections = []
    for (var key in models.MessageQueue.messageType) {
      messageTypeCollections.push([models.MessageQueue.messageType[key], key])
    };
    for (var key in models.MessageQueue.stateType) {
      stateTypeCollections.push([models.MessageQueue.stateType[key], key])
    };
    res.render("admin/messagequeues/index", {
      messagequeues: messagequeues,
      query: req.query,
      messageTypeCollections: messageTypeCollections,
      messageTypeOptions: messageTypeOptions,
      stateTypeCollections: stateTypeCollections,
      stateTypeOptions: stateTypeOptions
    })
  })
})

admin.get('/extractorders/export', function(req, res) {
  models.ExtractOrder.findAll({
    where: {
      state: models.ExtractOrder.STATE.INIT
    }
  }).then(function(extractorders) {
    console.log(extractorders)
    if(extractorders.length > 0){
      var results = []
      async.map(extractorders, function(extractorder, next) {
        results.push(extractorder.phone + ","+extractorder.value)
        extractorder.updateAttributes({
          state: models.ExtractOrder.STATE.SUCCESS
        }).then(function(extractorder) {
          next(null, extractorder)
        })
      }, function(err, extractorders) {
        if(err){
          console.log(err)
          res.send("error")
        }else{
          var filename = "export"+ (new Date).getTime() + ".txt"
          res.set({
            "Content-Disposition": 'attachment; filename="'+filename+'"',
            "Content-Type": "application/octet-stream"
          })
          res.send(results.join('\n'));
        }
      })
    }else{
      var filename = "export"+ (new Date).getTime() + ".txt",
          results = []
      res.set({
            "Content-Disposition": 'attachment; filename="'+filename+'"',
            "Content-Type": "application/octet-stream"
          })
      res.send(results.join('\n'))
    }
  })
})

// -------------------level-----------------------------

admin.get('/levels', function(req, res) {
  async.waterfall([function(next) {
    models.Level.findAndCountAll().then(function(levels) {
      next(null, levels)
    }).catch(function(err) {
      next(err)
    })
  }], function(err, levels) {
    if(err){
      console.log(err)
      res.redirect('/500')
    }else{
      result = helpers.setPagination(levels, req)
      res.render("admin/levels/index", {
        levels: result
      })
    }
  })
})

admin.get('/levels/new', function(req, res) {
  var level = models.Level.build()
  res.render('admin/levels/new', { level: level, path: '/admin/level' })
})

admin.post('/level', function(req, res) {
  console.log(req.body)
  models.Level.build(req.body).save().then(function(level) {
    if(level){
      req.flash("info", "update success")
      res.redirect('/admin/levels/' + level.id + '/edit')
    }else{
      req.flash("info", "update fail")
      res.redirect('/admin/levels/new')
    }
  }).catch(function(err) {
    console.log(err)
    req.flash("info", "update fail")
    res.redirect('/500')
  })
})

admin.get("/levels/:id/edit", function(req, res) {
  models.Level.findById(req.params.id).then(function(level) {
    if(level){
      res.render('admin/levels/edit', { level: level, path: '/admin/level/' + level.id, method: 'POST' })
    }else{
      res.redirect('/500')
    }
  }).catch(function(err){
    console.log(err)
    res.redirect('/500')
  })
})


admin.post("/level/:id", function(req, res) {
  async.waterfall([function(next) {
    models.Level.findById(req.params.id).then(function(level) {
      if(level){
        next(null, level)
      }else{
        next(null)
      }
    })
  }, function(level, next){
    level.updateAttributes(req.body).then(function(level) {
      if(level){
        next(null, level)
      }else{
        next(new Error('update fail'))
      }
    })
  }], function(err, level){
    if(err){
      console.log(err)
      req.flash("info", "update success")
      res.redirect('/500')
    }else{
      req.flash("info", "update fail")
      res.redirect('/admin/levels/' + level.id + '/edit')
    }
  })
})

// -----------------------level-------------------------------

// -------------- adming ---------------------


// --------------- app -----------------------
// var client = new OAuth(config.appId, config.appSecret, function (openid, callback) {
//   // 传入一个根据openid获取对应的全局token的方法
//   fs.readFile(openid +':access_token.txt', 'utf8', function (err, txt) {
//     if (err) {return callback(err);}
//     callback(null, JSON.parse(txt));
//   });
// }, function (openid, token, callback) {
//   // 请将token存储到全局，跨进程、跨机器级别的全局，比如写到数据库、redis等
//   // 这样才能在cluster模式及多机情况下使用，以下为写入到文件的示例
//   // 持久化时请注意，每个openid都对应一个唯一的token!
//   fs.writeFile(openid + ':access_token.txt', JSON.stringify(token), callback);
// });

var client = new OAuth(config.appId, config.appSecret);

app.get('/', function(req, res) {
  res.render('register', { layout: 'main' })
})

app.get('/auth', function(req, res) {
  var url = client.getAuthorizeURL('http://yiliuliang.net/register', '111111', 'snsapi_userinfo');
  res.redirect(url)
})

app.get('/register', function(req, res) {
  var code = req.query.code
  async.waterfall([function(next) {
    if(code){
      client.getAccessToken(code, function (err, result) {
        if(err){
          next(err)
        }else if(result.data){
          var accessToken = result.data.access_token;
          var openid = result.data.openid;
          next(null, accessToken, openid)
        }else{
          next(new Error('not found'))
        }
      });
    }else{
      next(new Error('user not allow login with wechat'))
    }
  }, function(accessToken, openid, next) {
    models.Customer.findOne({
      where: {
        wechat: openid
      }
    }).then(function (customer) {
      if(customer){
        req.session.customer_id = customer.id
        res.redirect('/profile')
        return
      }else{
        next(null, accessToken, openid)
      }
    })

  }, function(accessToken, openid, next) {
    client.getUser(openid, function (err, result) {
      if(err){
        next(err)
      }
      var userInfo = result;
      next(null, accessToken, openid, userInfo)
    });
  }, function(accessToken, openid, userInfo, next) {
    req.session.userInfo = userInfo
    req.session.openid = openid
    next(null)
  }], function(err) {
    if(err){
      console.log(err)
      res.redirect('/500')
    }else{
      res.render('register', { layout: 'main' })
    }
  })
})

app.post('/register', function(req, res){
  if(!req.body.phone ){
    res.json({ msg: '请输入手机号码', code: 0 })
    return
  }
  if(!req.session.userInfo || !req.session.openid){
    res.json({ msg: '微信授权失败', code: 1005 })
    return
  }
  models.MessageQueue.verifyCode(req.body.phone, req.body.code, 'register', function(messageQueue){
    if(messageQueue){
      models.Customer.build({
        password: '1234567',
        phone: req.body.phone,
        username: req.session.userInfo.nickname,
        wechat: req.session.openid,
        sex: req.session.userInfo.sex + '',
        city: req.session.userInfo.city,
        province: req.session.userInfo.province,
        country: req.session.userInfo.country,
        headimgurl: req.session.userInfo.headimgurl
      }).save().then(function(customer){
        if(customer){
          customer.updateAttributes({
            lastLoginAt: new Date()
          }).then(function(customer){
          })
          delete req.session.userInfo
          delete req.session.openid
          req.session.customer_id = customer.id
          res.json({ msg: 'create success', code: 1 })
        }else{
          console.log(err)
          res.json({ msg: 'create fail', code: 0, err: err.errors })
        }
      }).catch(function(err){
        console.log(err)
        res.json({ msg: 'create fail', code: 0, err: err.errors })
      })
    }else{
      res.json({ msg: '没有找到验证码或者验证码已经过期', code: 0 })
    }
  }, function(err) {
    console.log(err)
    res.json({ msg: 'server error', code: 0, err: err.errors })
  })
})

app.get('/getcode', function(req, res) {
  if(!req.query.phone){
    res.json({ msg: '请输入手机号码', code: 0 })
    return
  }
  models.MessageQueue.canSendMessage(req.query.phone, 'register', function(messageQueue) {
    if(messageQueue){
      res.json({ msg: "Please try again after 1 minite", code: 2 });
    }else{
      models.MessageQueue.sendRegisterMessage(models, req.query.phone, function(messageQueue){
        if(messageQueue){
          res.json({ msg: "message had send", code: 1 })
        }
      }, function(err){
        console.log(err)
        res.json({ msg: "try again later", err: err.errors, code: 0 })
      })
    }
  })
})

app.get('/profile', requireLogin, function(req, res) {
  var customer = req.customer
  customer.getLastFlowHistory(models, models.FlowHistory.STATE.ADD, function(customer, flowHistory){
    res.render('yiweixin/customer/show', { customer: customer, flowHistory: customer.lastFlowHistory })
  }, function(err){
    console.log(err)
  })
})

app.get('/payment', requireLogin, function(req, res) {
  var customer = req.customer
  async.waterfall([function(next){
    if(customer.levelId !== undefined){
        models.Level.findById(customer.levelId).then(function(level) {
          customer.level = level
        })
      }
      next(null, customer)
  }, function(customer, next) {
    models.Coupon.findAll({
      where: {
        isActive: true,
        expiredAt: {
          $gt: (new Date()).begingOfDate()
        }
      },
      order: [
              ['updatedAt', 'DESC']
             ]
    }).then(function(coupons) {
      next(null, coupons)
    }).catch(function(err) {
      next(err)
    })
  }], function(err, coupons) {
    if(err){
      console.log(err)
    }else{
      models.DataPlan.allOptions(function(dataPlans){

        for (var i = coupons.length - 1; i >= 0; i--) {
          for (var j = dataPlans.length - 1; j >= 0; j--) {
            if(coupons[i].dataPlanId == dataPlans[j].id){
              if(dataPlans[j].coupon === undefined){
                dataPlans[j].coupon = coupons[i]
              }else if(dataPlans[j].coupon.updatedAt < coupons[i].updatedAt){
                dataPlans[j].coupon = coupons[i]
              }
            }
          };
        };
        res.render('yiweixin/orders/payment', { customer: customer, dataPlans: dataPlans })
      }, function(err) {
        console.log(err)
      })
    }
  })


})

app.get('/pay', requireLogin, function(req, res) {
    var customer = req.customer
    async.waterfall([function(next){
      if(customer.levelId !== undefined){
        models.Level.findById(customer.levelId).then(function(level) {
          customer.level = level
        })
      }
      next(null, customer)
    }, function(customer, next) {
      models.PaymentMethod.findOne({ where: { code: req.query.paymentMethod.toLowerCase() } }).then(function(paymentMethod) {
        if(paymentMethod){
          next(null, paymentMethod);
        }else{
          res.json({ err: 1, msg: "找不到支付方式" })
        }
      }).catch(function(err){
        next(err)
      })
    }, function(paymentMethod, next){
      models.DataPlan.findById(req.query.dataPlanId).then(function(dataPlan){
        if(dataPlan){
          next(null, paymentMethod, dataPlan)
        }else{
          res.json({ err: 1, msg: "请选择合适的套餐" })
        }
      }).catch(function(err) {
        next(err)
      })
    }, function(paymentMethod, dataPlan, next){
      models.Coupon.findAll({
        where: {
          dataPlanId: dataPlan.id,
          isActive: true,
          expiredAt: {
            $gt: (new Date()).begingOfDate()
          }
        },
        order: [
                ['updatedAt', 'DESC']
               ]
      }).then(function(coupons) {
        dataPlan.coupon = coupons[0]
        next(null, paymentMethod, dataPlan)
      }).catch(function(err) {
        next(err)
      })
    }, function(paymentMethod, dataPlan, next){
      var discount = 1.00
      if(dataPlan.coupon && dataPlan.coupon.ignoreLevel && dataPlan.coupon.discount > 0){
        discount = discount - dataPlan.coupon.discount
      }else if(customer.level && customer.level.discount > 0){
        discount = discount - customer.level.discount
      }
      models.Order.build({
        state: models.Order.STATE.INIT,
        customerId: customer.id,
        dataPlanId: dataPlan.id,
        paymentMethodId: paymentMethod.id,
        total: dataPlan.price * discount
      }).save().then(function(order){
        next(null, paymentMethod, dataPlan, order)
      }).catch(function(err){
        next(err)
      })
    }], function(error, paymentMethod, dataPlan, order){
      if(error){
        console.log(error)
        res.json({ err: 1, msg: "server error" })
      }else{
        var ipstr = req.ip.split(':'),
          ip = ipstr[ipstr.length -1]

        var orderParams = {
          body: '流量套餐 ' + dataPlan.name,
          attach: order.id,
          out_trade_no: 'yiliuliang' + (+new Date),
          total_fee:  Math.round(order.total * 100),
          spbill_create_ip: ip,
          openid: customer.wechat,
          trade_type: 'JSAPI'
        };

        console.log(orderParams)
        payment.getBrandWCPayRequestParams(orderParams, function(err, payargs){
          if(err){
            console.log("payment fail")
            console.log(err)
            res.json({err: 1, msg: 'payment fail'})
          }else{
            console.log(payargs)
            res.json(payargs);
          }
        });
      }
    })
})

var middleware = require('wechat-pay').middleware;
app.use('/paymentconfirm', middleware(initConfig).getNotify().done(function(message, req, res, next) {
  console.log(message)

  var orderId = message.attach

  async.waterfall([function(next) {
    models.Order.findById(orderId).then(function(order) {
      if(order){
        next(null, order)
      }else{
        next(new Error('order not found'))
      }
    }).catch(function(err) {
      next(err)
    })
  }, function(order, next){
    if(message.result_code === 'SUCCESS' && !order.isPaid()){
      order.updateAttributes({
        state: models.Order.STATE.PAID,
        transactionId: message.transaction_id
      }).then(function(order){
        next(null, order)
      })
    }else{
      next(new Error("pass"))
    }
  }, function(order, next) {
    models.Customer.findById(order.customerId).then(function(customer) {
      next(null, order, customer)
    }).catch(function(err) {
      next(err)
    })
  }, function(order, customer, next) {
    customer.addTraffic(models, order, function(customer, order, flowHistory){
      next(null, order, flowHistory)
    }, function(err) {
      next(err)
    })
  }], function(err, order, flowHistory){
    if(err){
      res.reply(err)
    }else{
      res.reply('success');
    }
  })
}));

app.get('/extractflow', requireLogin, function(req, res){
  res.render('yiweixin/orders/extractflow', { customer: req.customer })
})

app.post("/extractFlow", requireLogin, function(req, res){
  var customer = req.customer
  if(!req.body.phone){
    res.json({ err: 1, msg: "请输入手机号码" })
    return
  }
  async.waterfall([function(next){
    models.TrafficPlan.findById(req.body.flowId).then(function(trafficPlan){
      if(trafficPlan){
        next(null, trafficPlan)
      }else{
        res.json({ err: 1, msg: "请选择正确的流量包" })
      }
    })
  }, function(trafficPlan, next) {
    if(customer.remainingTraffic > trafficPlan.cost){
      next(null, trafficPlan)
    }else{
      next(new Error("没有足够流量币"))
    }
  }, function(trafficPlan, next){
    models.ExtractOrder.build({
      exchangerType: trafficPlan.className(),
      exchangerId: trafficPlan.id,
      phone: req.body.phone,
      cost: trafficPlan.cost,
      value: trafficPlan.value
    }).save().then(function(extractOrder) {
      next(null, trafficPlan, extractOrder)
    }).catch(function(err) {
      next(err)
    })
  }, function(trafficPlan, extractOrder, next){
    //
    customer.reduceTraffic(models, extractOrder, function(customer, extractOrder, trafficPlan, flowHistory) {
      next(null, customer, extractOrder)
    }, function(err) {
      next(err)
    })
  }, function(customer, extractOrder, next) {
    extractOrder.updateAttributes({
      state: models.ExtractOrder.STATE.INIT
    }).then(function(extractOrder) {
      next(null, customer, extractOrder)
    })
  }], function(err, result){
    if(err){
      console.log(err)
      res.json({ err: 1, msg: err.message })
    }else{
      res.json({ err: 0, msg: "充值成功，请注意查收短信", url: "/profile" })
    }
  })
})

app.get('/getTrafficplans', requireLogin, function(req, res){
  if(models.TrafficPlan.Provider[req.query.catName] !== undefined){
    var providerId = models.TrafficPlan.Provider[req.query.catName]
    models.TrafficPlan.findAll({ where: { providerId: providerId },
                                 order: [
                                  'sortNum', 'id'
                                 ]}).then(function(trafficPlans){
                                    res.json(trafficPlans)
                                 })
  }else{
    res.json({ err: 1, msg: "phone err" })
  }
})

app.get("/income", requireLogin, function(req, res){
  var customer = req.customer
  models.FlowHistory.incomeHistories({
    where: {
      customerId: customer.id
    }
  }, function(flowHistories){
    res.render('yiweixin/flowhistories/income', { flowHistories: flowHistories })
  }, function(err){
    console.log(err)
  })
})


app.get("/spend", requireLogin, function(req, res){
  var customer = req.customer
  models.FlowHistory.reduceHistories({
    where: {
      customerId: customer.id
    }
  }, function(flowHistories){
    res.render('yiweixin/flowhistories/spend', { flowHistories: flowHistories })
  }, function(err){
    console.log(err)
  })
})


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

app.get('/tasks', function(req, res) {
  var tasks = models.FlowTask.scope('active', 'defaultSort').findAll().then(function(tasks) {
    res.render('yiweixin/flowtasks/index', { tasks: tasks })
  }).catch(function(err) {
      console.log(err)
      res.redirect('/500')
  })
})

app.get('/tasks/:id', function(req, res) {
  models.FlowTask.findById(req.params.id).then(function(flowtask) {
    res.render('yiweixin/flowtasks/show', { task: flowtask})
  })
})

app.get('/apkcenter', requireLogin, function(req, res) {
  var customer = req.customer
  models.Apk.activeList(function(apks) {
    res.render("yiweixin/apkcenter/index", { apks: apks, customer: customer  })
  }, function(err) {
    console.log(err)
  })
})

app.get('/apkcenter/:id', function(req, res) {
  if(! req.params.id.match(/\d/)){
    res.redirect('/404');
    return
  }
  async.waterfall([function(next){
    if(req.query.c){
      models.Customer.findOne({
        where: {
          password_hash: req.query.c
        }
      }).then(function(customer){
        if(customer){
          next(null, customer)
        }else{
          next(null, null)
        }
      }).catch()
    }else{
      next(null, null)
    }
  }, function(customer, next){
     models.Apk.findById(req.params.id).then(function(apk){
      next(null, apk, customer)
    }).catch(function(err){
      next(err)
    })
  }], function(err, apk, customer) {
    if(err){
      console.log(err)
      res.redirect('/apkcenter')
    }else{
      res.render('yiweixin/apkcenter/show', { apk: apk, customer: customer })
    }
  })
})

app.get('/apkcenter/download/:id', function(req, res) {
  if(! req.params.id.match(/\d/)){
    res.redirect('/404');
    return
  }
  async.waterfall([function(next){
    models.Customer.findOne({
      where: {
        password_hash: req.query.c
      }
    }).then(function(customer) {
      if(customer){
        next(null, customer)
      }else{
        next(null, null)
      }
    }).catch()
  }, function(customer, next) {
    models.Apk.findById(req.params.id).then(function(apk){
      next(null, customer, apk)
    }).catch(function(err){
      next(err)
    })
  }, function(customer, apk, next){
    res.download( helpers.fullPath(apk.apkPath), apk.apk, function(err){
      if (err) {
        next(err)
      } else {
        next(null, customer, apk)
      }
    });
  }, function(customer, apk, next){
    if(customer){
      customer.getFlowHistories({
        where: {
          state:  models.FlowHistory.STATE.ADD,
          type: "Apk",
          typeId: apk.id
        }
      }).then(function(existFlowHistories){
        if(existFlowHistories instanceof Array && existFlowHistories[0] ){  // no update
          next(null, customer, apk, existFlowHistories[0])
        }else{
          next(null, customer, apk, null)
        }
      })
    }else{
      next(null, customer, apk, null)
    }
  }, function(customer, apk, existFlowHistory, next) {
    if(customer && !existFlowHistory && apk.isActive){
      customer.updateAttributes({
        remainingTraffic: customer.remainingTraffic + apk.reward
      }).then(function(customer) {
        next(null, customer, apk, true)
      })
    }else{
      next(null, customer, apk, false)
    }
  }, function(customer, apk, isUpdated, next){
    if(customer && isUpdated){
      customer.takeFlowHistory(models, apk, apk.reward, "首次下载app" + app.name, models.FlowHistory.STATE.ADD, function(flowHistory){
        next(null, customer, apk, flowHistory)
      }, function(err){})
    }else{
      next(null, customer, apk, null)
    }
  }, function(customer, apk, flowHistory, next) {
    apk.updateAttributes({
      downloadTime: apk.downloadTime+1
    }).then(function(apk) {
      next(null, customer. apk, flowHistory)
    }).catch(function(err){})
  }], function(err, customer, apk, flowHistory){
    if(err){
      console.log(err)
      res.send(404);
    }
  })
})

app.get("/taskconfirm/:id", function(req, res) {
  var id = req.params.id,
      token = req.query.token,
      phone = req.query.phone
  if(! id.match(/\d/)){
    res.redirect('/404');
    return
  }
  if(!(id && token && phone)) {
    res.json({ err: 1 , code: 1001, msg: "参数缺失"})
  }

  async.waterfall([function(next){
    models.Seller.findOne({
      where: {
        accessToken: token
      }
    }).then(function(seller) {
      next(null, seller)
    }).catch(function(err) {
      next(err)
    })
  }, function(seller, next) {
    models.FlowTask.findOne({
      where: {
        id: id,
        seller_id: seller.id,
        isActive: true,
        expiredAt: {
          $gt: (new Date()).begingOfDate()
        }
      }
    }).then(function(flowtask) {
      if(flowtask){
        next(null, seller, flowtask)
      }else{
        res.json({ err: 1, code: 1004, msg: "没有找到对应的任务"})
      }
    }).catch(function(err) {
      next(err)
    })
  }, function(seller, flowtask, next) {
    models.TrafficPlan.findById(flowtask.trafficPlanId).then(function(trafficPlan) {
      next(null, seller, flowtask, trafficPlan)
    }).catch(function(err) {
      next(err)
    })
  }, function(seller, flowtask, trafficPlan, next){
    models.ExtractOrder.build({
      exchangerType: flowtask.className(),
      exchangerId: flowtask.id,
      phone: phone,
      cost: 0,
      value: trafficPlan.value
    }).save().then(function(extractOrder) {
      next(null, seller, flowtask, trafficPlan, extractOrder)
    }).catch(function(err) {
      next(err)
    })
  }, function(seller, flowtask, trafficPlan, extractOrder, next) {
    // TODO
    extractOrder.updateAttributes({
      state: models.ExtractOrder.STATE.SUCCESS
    }).then(function(extractOrder) {
      next(null, seller, flowtask, trafficPlan, extractOrder)
    }).catch(function(err) {
      next(err)
    })
  }, function(seller, flowtask, trafficPlan, extractOrder, next) {
    // finishTime
    flowtask.updateAttributes({
      finishTime: flowtask.finishTime + 1
    }).then(function(flowtask) {
      next(null, seller, flowtask, trafficPlan, extractOrder)
    }).catch(function(err) {
      next(err)
    })
  }], function(err, seller, flowtask, trafficPlan, extractOrder){
    if(err){
      console.log(err)
      res.json({ err: 1, code: 1003, msg: "参数错误"})
    }else{
      res.json({
        err: 0, msg: "confirm success"
      })
    }
  })

})

// --------------- app -----------------------

app.get('/404', function(req, res, next){
  next();
});

app.get('/403', function(req, res, next){
  var err = new Error('not allowed!');
  err.status = 403;
  next(err);
});

app.get('/500', function(req, res, next){
  next(new Error('keyboard cat!'));
});


app.use(function(req, res, next){
  res.status(404);

  if (req.accepts('html')) {
    res.render('404', { layout: false, url: req.url });
    return;
  }

  if (req.accepts('json')) {
    res.send({ error: 'Not found' });
    return;
  }

  res.type('txt').send('Not found');
});

app.use(function(err, req, res, next){
  console.log(err)
  res.status(err.status || 500);
  res.render('500', { layout: false, error: err });
});



var server = app.listen(app.get('port'), function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
});