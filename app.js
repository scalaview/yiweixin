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
        title: '你来我家接我吧',
        description: '这是女神与高富帅之间的对话',
        picurl: 'http://nodeapi.cloudfoundry.com/qrcode.jpg',
        url: 'http://nodeapi.cloudfoundry.com/'
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



//login filter

// var skipUrls = ['/wechat', '/admin/login', '/admin/register']
// admin.use(function (req, res, next) {
//     var url = req.originalUrl;
//     if (!_.includes(skipUrls, url) && !req.session.user_id) {
//         return res.redirect("/admin/login");
//     }
//     next();
// });

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

// -------------- adming ---------------------
admin.get('/', function (req, res) {
  console.log(admin.mountpath);
  res.render('admin/home');
});

admin.get('/login', function(req, res){
  res.render('admin/login', { layout: 'sign' })
})

admin.post('/login', urlencodedParser, function(req, res) {
  models.User.findOne({ where: {username: req.body.username} }).then(function(user){
    if(user && user.verifyPassword(req.body.password)){
      req.session.user_id = user.id
      res.redirect('/admin')
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
  res.send("flowtask index")
})

admin.get('/flowtask/new', function(req, res) {
  res.render('./admin/flowtasks/new')
})

admin.post('/flowtask', function(req, res) {

  var form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, files) {
    models.FlowTask.build({
      title: fields.title,
      content: fields.content,
      expiredAt: new Date(fields.expired_at),
      isActive: fields.is_active ? true : false,
      sortNum: fields.sort_num,
      cover: files.cover,
      seller_id: 1
    }).save().then(function(flowtask) {
      res.send('ok')
    }, function(err) {
      res.send(err)
    });


  });
});

admin.get('/customers', function(req, res) {
  models.Customer.findAll().then(function (customers){
    res.render('admin/customers/index', { customers: customers })
  })
})

// -------------- adming ---------------------


// --------------- app -----------------------
app.get('/register', function(req, res){
  res.render('register', { layout: false })
})

app.post('/register', function(req, res){
  models.MessageQueue.verifyCode(req.body.phone, req.body.code, 'register', function(messageQueue){
    console.log(messageQueue)
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
        res.json({ msg: "try again later", err: err.errors })
      })
    }
  })
})

app.get('/profile', requireLogin, function(req, res) {
  res.render('yiweixin/customer/show', { customer: req.customer })
})

app.get('/payment', requireLogin, function(req, res) {
  var customer = req.customer

  models.DataPlan.allOptions(function(dataPlans){
    console.log(1)
    res.render('yiweixin/orders/payment', { customer: customer, dataPlans: dataPlans  })
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
        // do payment
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
      customer.addTraffic(order, function(obj){
          res.json({ msg: "充值成功" })
        }, function(err) {
          res.json({ err: 1, msg: "server error" })
        })
    }], function(error, callback){
      console.log(error)
      res.json({ err: 1, msg: "server error" })
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
  console.log(helpers)
  var tasks = models.FlowTask.scope('active', 'defaultSort').findAll().then(function(tasks) {
    res.render('yiweixin/flowtasks/index', { tasks: tasks })
  })
})

app.get('/tasks/:id', function(req, res) {
  models.FlowTask.findById(req.params.id).then(function(flowtask) {
    res.render('yiweixin/flowtasks/show', { task: flowtask})
  })
})

// --------------- app -----------------------

var server = app.listen(app.get('port'), function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
});

