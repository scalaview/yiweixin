'use strict';
module.exports = function(sequelize, DataTypes) {
  var MessageQueue = sequelize.define('MessageQueue', {
    phone: {type: DataTypes.STRING, allowNull: false},
    content: {type: DataTypes.STRING, allowNull: true},
    state: {type: DataTypes.INTEGER, allowNull: false, defaultValue: 0},
    type: {
      type: DataTypes.INTEGER,
      allowNull: false,
      set: function(val){
        if(MessageQueue.messageType[val] !== undefined){
          this.setDataValue('type', MessageQueue.messageType[val])
        }else{
          throw new Error("Please input a correct message type");
        }
      }
    },
    sendAt: {type: DataTypes.DATE, allowNull: true},
    verificationCode: {type: DataTypes.STRING, allowNull: true},
    retryTime: {type: DataTypes.INTEGER, allowNull: false, defaultValue: 0},
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
      },
      canSendMessage: function(phone, type, callback) {
        console.log(new Date())
        if (MessageQueue.messageType[type] !== undefined){
          MessageQueue.findOne({ where: {
            phone: phone,
            type: MessageQueue.messageType[type],
            sendAt: {gt: new Date((new Date()).getTime() - 60 * 1000)}
          } }).then(callback);
        } else {
          throw new Error("Please input a correct message type");
        }
      },
      sendRegisterMessage: function(phone, successCallBack, errorCallBack){
        var num = Math.floor(Math.random() * 90000) + 10000;
        MessageQueue.build({
          phone: phone,
          content: "xxxxxxxxxx  xxxx   xxx" + num + "xxxxxx",
          type: "register",
          verificationCode: num + ''
        }).save().then(successCallBack).catch(errorCallBack)
      },
      verifyCode: function(phone, code, type, successCallBack, errorCallBack){
        if (MessageQueue.messageType[type] !== undefined){
          MessageQueue.findOne({ where: {
            phone: phone,
            type: MessageQueue.messageType[type],
            verificationCode: code,
            sendAt: {gt: new Date((new Date()).getTime() - 30 * 60 * 1000)}
          } }).then(successCallBack).catch(errorCallBack)
        }else{
          throw new Error("Please input a correct message type");
        }
      }
    }
  });
  MessageQueue.messageType = {
    register: 0
  }

  MessageQueue.stateType = {
    onHold: 0,
    send: 1,
    fail: 2
  }

  return MessageQueue;
};