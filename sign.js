var raw = function (args) {
  for (var i = 0; i < args.length ; i++) {
    if(args[i] > args[i + 1]){
      var tmp = args[i]
      args[i] = args[i + 1]
      args[i + 1] = tmp
    }
  }
  return args.join('');
};

exports.sha = function (token, timestamp, nonce) {
  var args = [token, timestamp, nonce]
  var string = raw(args);
      jsSHA = require('crypto').createHash('sha1');
  return jsSHA.update(string).digest('hex')
};
