exports.sha = function (token, timestamp, nonce) {
  var args = [token, timestamp, nonce].sort()
  var string = args.join('');
      jsSHA = require('crypto').createHash('sha1');
  return jsSHA.update(string).digest('hex')
};
