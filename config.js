var config = {
                'token': 'yiliuliang',
                'appId': 'wx70f980766b6904b2',
                'aesKey': '48r29Vap81kFESsDcsaPXZOYfCm86G7mIBoLRUzIUbf',
                'appSecret': '329e3398b76c96f9e044fb172ef1a3a8',
                'menus': {
                           "button":[
                           {
                                "type":"click",
                                "name":"玩流量",
                                "sub_button":[
                                {
                                  "type":"view",
                                  "name":"新手攻略",
                                  "url":"http://www.yiliuliang.net"
                                },
                                {
                                  "type":"view",
                                  "name":"领取记录",
                                  "url":"http://www.yiliuliang.net"
                                },
                                {
                                  "type":"view",
                                  "name":"领取流量",
                                  "url":"http://www.yiliuliang.net"
                                },
                                {
                                  "type":"click",
                                  "name":"今日任务",
                                  "key":"V1001_TODAY_TASKS"
                                }]
                            },
                            {
                                "type":"view",
                                "name":"我的钱包",
                                "url":"http://www.yiliuliang.net"
                            },
                            {
                              "type":"view",
                              "name":"更多",
                              "sub_button":[
                              {
                                "type":"view",
                                "name":"关于易流量",
                                "url":"http://www.yiliuliang.net"
                              }]
                            }]
                        },
                'menus_keys': {
                  'button1' :'V1001_TODAY_TASKS'
                }
              };

module.exports = config;