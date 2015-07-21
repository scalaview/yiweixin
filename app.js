var express = require('express');
var app = express();

app.set('port', process.env.PORT || 3000)

app.get('/', function (req, res) {
  res.send('yiliuliangtoken');
});

var server = app.listen(app.get('port'), function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
});

