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

var app = express();
var admin = express();

var handlebars = require('express-handlebars').create({
  defaultLayout: 'main',
  helpers: helpers
});

app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');

app.set('port', process.env.PORT || 3000);

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
  req.session.customer_id = 1

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

app.get('/', function(req, res) {
  res.render('home')
})

var skipUrls = [ '^\/wechat[]*', '^\/admin\/login*', '^\/admin\/register*']

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
  console.log(admin.mountpath);
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
        res.render('login', {
         locals: {message: message},
         layout: 'sign'
        })
      }else{
        message = 'register new user'
        res.render('register', {
          locals: {message: message},
          layout: 'sign'
        })
      }
    }
  })
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
    res.redirect('/admin')
  }).catch(function(err) {
    req.flash('errors', err.errors)
    res.render('register', {
      locals: { user: user },
      layout: 'sign'
    })
  })
})


admin.get('/flowtasks', function(req, res) {
  var result;
  async.waterfall([function(next) {
    models.FlowTask.findAndCountAll({
      where: {}   ,
      limit: req.query.perPage || 15,
      offset: helpers.offset(req.query.page, req.query.perPage || 15)
    }).then(function(flowtasks) {
      result = flowtasks
      next(null, flowtasks.rows)
    })
  }], function(err, flowtasks, next) {
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
        res.send(500)
      }else{
        result.rows = flowtasks
        result = helpers.setPagination(result, req)
        res.render("admin/flowtasks/index", { flowtasks: result })
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
      sortNum: fields.sort_num,
      cover: files.cover,
      seller_id: fields.seller_id,
      trafficPlanId: fields.trafficPlanId,
      actionUrl: fields.actionUrl
    }).save().then(function(flowtask) {
      res.redirect("/admin/flowtasks/" + flowtask.id + "/edit")
    }).catch(function(err) {
      res.send(err)
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
      attributes = _.merge(fields, { cover: files.cover })
      attributes['isActive'] = fields.is_active ? 1 : 0
      flowtask.updateAttributes(attributes).then(function(flowtask) {
        next(null, flowtask)
      }).catch(function(err) {
        next(err)
      })
    }], function(err, flowtask) {
      if(err){
        console.log(err)
        res.redirect("/admin/flowtasks/" + flowtask.id + "/edit")
      }else{
        res.redirect("/admin/flowtasks")
      }
    })
  })
})

admin.get('/customers', function(req, res) {
  models.Customer.findAndCountAll({
    where: {},
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
      description: fields.description,
      digest: fields.digest
    }).save().then(function(apk) {
      res.redirect("/admin/apks/"+apk.id+'/edit')
    }).catch(function(err, apk) {
      console.log(err)
      res.send(err)
    })
  })
})

admin.get("/apks", function(req, res){
  var result
  async.waterfall([function(next) {
    models.Apk.findAndCountAll({
        where: {},
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
  }], function(err, apks) {
    if(err){
      console.log(err)
      res.send(500)
    }else{
      result.rows = apks
      result = helpers.setPagination(result, req)
      res.render('admin/apks/index', { apks: result, query: req.query })

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
      attributes = _.merge(fields, {
        icon: files.icon,
        apk: files.apk,
        image01: files.image01,
        image02: files.image02,
        image03: files.image03
      })
      attributes['isActive'] = fields.isActive ? 1 : 0
      apk.updateAttributes(attributes).then(function(apk) {
        next(null, apk)
      }).catch(function(err) {
        next(err)
      })
    }], function(err, apk) {
      if(err){
        console.log(err)
        res.redirect("/admin/apk/" + apk.id + "/edit")
      }else{
        res.redirect("/admin/apks")
      }
    })
  })
})


// -----------------customer ------------------
admin.get("/customers/:id", function(req, res) {
  models.Customer.findById(req.params.id).then(function(customer) {
    if(customer){
      res.render("admin/customers/show", { customer: customer })
    }else{
      res.send(404)
    }
  }).catch(function(err) {
    console.log(err)
    res.send(500)
  })
})



admin.get("/flowhistories", function(req, res){
  var result;
  async.waterfall([function(next) {
    var params = {}
    if(req.query.customerId !== undefined){
      params = _.merge(params, { customerId: req.query.customerId })
    }
    if(req.query.type !== undefined){
      params = _.merge(params, { type: req.query.type })
    }
    if(req.query.typeId !== undefined){
      params = _.merge(params, { typeId: req.query.typeId.toI() })
    }
    if(req.query.state !== undefined){
      params = _.merge(params, { state: req.query.state })
    }
    models.FlowHistory.findAndCountAll({
      where: params,
      limit: req.query.perPage || 15,
      offset: helpers.offset(req.query.page, req.query.perPage || 15)
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
  }], function(err, flowhistories) {
    if(err){
      console.log(err)
      res.send(500)
    }else{
      result.rows = flowhistories
      result = helpers.setPagination(result, req)
      res.render('admin/flowhistories/index', { flowhistories: result, query: req.query })
    }
  })
})

// ---------------------customer--------------


admin.get("/extractorders", function(req, res) {
  var result;
  async.waterfall([function(next) {
    var params;
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
      result.rows = extractOrders
      result = helpers.setPagination(result, req)
      res.render('admin/extractorders/index', { extractOrders: result, query: req.query })
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
  console.log(req.body)
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
      res.redirect("/admin/extractorders/new")
    }else{
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
    }
    res.redirect("/admin/extractorders/" + extractOrder.id + "/edit")

  })

})


// -------------- adming ---------------------


// --------------- app -----------------------
app.get('/register', function(req, res){
  res.render('register', { layout: false })
})

app.post('/register', function(req, res){
  models.MessageQueue.verifyCode(req.body.phone, req.body.code, 'register', function(messageQueue){
    if(messageQueue){
      models.Customer.build({
        username: req.body.phone,
        password: '1234567',
        phone: req.body.phone
      }).save().then(function(customer){
        if(customer){
          customer.updateAttributes({
            lastLoginAt: new Date()
          }).then(function(customer){
          })
          req.session.customer_id = customer.id
          res.json({ msg: 'create success', code: 1 })
        }else{
          res.json({ msg: 'create fail', code: 0, err: err.errors })
        }
      }).catch(function(err){
        res.json({ msg: 'create fail', code: 0, err: err.errors })
      })
    }else{
      res.json({ msg: '没有找到验证码或者验证码已经过期', code: 0 })
    }
  }, function(err) {
    res.json({ msg: 'server error', code: 0, err: err.errors })
  })
})

app.get('/getcode', function(req, res) {
  models.MessageQueue.canSendMessage(req.query.phone, 'register', function(messageQueue) {
    if(messageQueue){
      res.json({ msg: "Please try again after 1 minite" });
    }else{
      models.MessageQueue.sendRegisterMessage(req.query.phone, function(messageQueue){
        if(messageQueue){
          res.json({ msg: "message had send", code: messageQueue.verificationCode })
        }
      }, function(err){
        console.log(err)
        res.json({ msg: "try again later", err: err.errors })
      })
    }
  })
})

app.get('/profile', requireLogin, function(req, res) {
  var customer = req.customer
  customer.getLastFlowHistory(models, models.FlowHistory.STATE.ADD, function(customer, flowHistory){
    // console.log(customer.lastFlowHistory.source)
    res.render('yiweixin/customer/show', { customer: customer, flowHistory: customer.lastFlowHistory })
  }, function(err){
    console.log(err)
  })
})

app.get('/payment', requireLogin, function(req, res) {
  var customer = req.customer
  models.DataPlan.allOptions(function(dataPlans){
    res.render('yiweixin/orders/payment', { customer: customer, dataPlans: dataPlans })
  }, function(err) {
    console.log(err)
  })

})

app.post('/pay', requireLogin, function(req, res) {
    var customer = req.customer
    var paymentMethod, dataPlan, order;
    async.waterfall([function(next) {
      models.PaymentMethod.findOne({ where: { code: req.body.paymentMethod.toLowerCase() } }).then(function(payment) {
        if(payment){
          paymentMethod = payment;
          next();
        }else{
          res.json({ err: 1, msg: "找不到支付方式" })
        }
      }).catch(function(err){
        console.log(err)
        res.json({ err: 1, meg: "server error" })
      })
    }, function(next){
      models.DataPlan.findById(req.body.dataPlanId).then(function(plan){
        if(plan){
          dataPlan = plan
          next()
        }else{
          res.json({ err: 1, msg: "请选择合适的套餐" })
        }
      }).catch(function(err) {
        console.log(err)
        res.json({ err: 1, meg: "server error" })
      })
    }, function(next){
      models.Order.build({
        state: models.Order.STATE.INIT,
        customerId: customer.id,
        dataPlanId: dataPlan.id,
        paymentMethodId: paymentMethod.id,
        total: dataPlan.price
      }).save().then(function(obj){
        //TODO do payment
        order = obj
        next()
      }).catch(function(err){
        console.log(err)
        res.json({ err: 1, meg: "server error" })
      })
    }, function(next){
      if(true){
        order.updateAttributes({
          state: models.Order.STATE.PAID
        }).then(function(order){
          next()
        })
      }else{
        order.updateAttributes({
          state: models.Order.STATE.FAIL
        }).then(function(order){
          res.json({ err: 1, msg: "支付失败，请稍候重试" })
        })
      }
    }, function(next){
      customer.addTraffic(models, order, function(customer, order, flowHistory){
          res.json({ err: 0, url: '/profile', msg: "充值成功" })
        }, function(err) {
          console.log(err)
          res.json({ err: 1, msg: "server error" })
        })
    }], function(error, callback){
      console.log(error)
      res.json({ err: 1, msg: "server error" })
    })
})

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
      state: models.ExtractOrder.STATE.SUCCESS
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

app.get('/getTrafficplans', function(req, res){
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
    console.log(messageQueue)
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
  })
})

app.get('/tasks/:id', function(req, res) {
  models.FlowTask.findById(req.params.id).then(function(flowtask) {
    res.render('yiweixin/flowtasks/show', { task: flowtask})
  })
})

app.get('/apkcenter', requireLogin, function(req, res) {
  var customer = req.customer
  console.log(customer)
  models.Apk.activeList(function(apks) {
    res.render("yiweixin/apkcenter/index", { apks: apks, customer: customer  })
  }, function(err) {
    console.log(err)
  })
})

app.get('/apkcenter/:id', function(req, res) {
  async.waterfall([function(next){
    if(req.query.c){
      models.Customer.findById(req.query.c).then(function(customer){
        next(null, customer)
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
  async.waterfall([function(next){
    models.Customer.findById(req.query.c).then(function(customer) {
      next(null, customer)
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
    if(customer && !existFlowHistory){
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
        next(null, customer. apk, flowHistory)
      }, function(err){})
    }
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

  if(!(id && token && phone)) {
    res.json({ err: 1 , code: 1001, msg: "参数缺失"})
  }

  async.waterfall([function(next){
    models.Seller.findOne({
      where: {
        accessToken: token
      }
    }).then(function(seller) {
      next(err, seller)
    }).catch(function(err) {
      next(err)
    })
  }, function(seller, next) {
    models.FlowTask.findOne({
      id: id,
      seller_id: seller.id
    }).then(function(flowtask) {
      if(flowtask){
        next(null, seller, flowtask)
      }else{
        next(new Error("没有找到对应的任务"))
      }
    }).catch(function(err) {
      next(err)
    })
  }, function(seller, flowtask, next) {
    models.TrafficPlan.findById(flowtask.trafficPlanId).then(function(trafficPlan) {
      next(seller, flowtask, trafficPlan)
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
    extractOrder.updateAttributes({
      finishTime: extractOrder.finishTime + 1,
      state: models.ExtractOrder.STATE.SUCCESS
    }).then(function(extractOrder) {
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

var server = app.listen(app.get('port'), function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
});
