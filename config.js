var config = {
                'token': 'yiliuliang',
                'appId': 'wx70f980766b6904b2',
                'aesKey': '48r29Vap81kFESsDcsaPXZOYfCm86G7mIBoLRUzIUbf',
                'appSecret': '329e3398b76c96f9e044fb172ef1a3a8',
                'menus': {
                       "button":[
                       {
                            "type":"click",
                            "name":"今日歌曲",
                            "key":"V1001_TODAY_MUSIC"
                        },
                        {
                             "name":"菜单",
                             "sub_button":[
                             {
                                 "type":"view",
                                 "name":"搜索",
                                 "url":"http://www.soso.com/"
                              },
                              {
                                 "type":"view",
                                 "name":"视频",
                                 "url":"http://v.qq.com/"
                              },
                              {
                                 "type":"click",
                                 "name":"赞一下我们",
                                 "key":"V1001_GOOD"
                              }]
                         }]
                   },
                'menus_keys': {
                  'button1' :'V1001_TODAY_MUSIC'
                }
              };

module.exports = config;