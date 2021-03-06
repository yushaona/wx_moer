//index.js
//获取应用实例
const util = require('../../../utils/util.js');
const dataList = require('data.js');  
const app = getApp();

Page({
    data: {
        userInfo: null,
        userImg: util.staticFile + '/moer.jpg',
        staticFile: util.staticFile,
        type: 0, // 展示的类型： 0、摩研社； 1、摩股学院；
        info: {}, // 切换的TAB数据
        sort: 0, // 栏目的切换，默认显示第一项
        status: {
            tabFlag: [true, true], // TAB 是否滑动的状态
            loading: [0, 0]  // 加载更多的状态： 0、未加载； 1、加载中； 2、没有更多内容
        },
        tryReadArticles: [],  // 试读文章的数据
        latestArticles: {},  // 最新文章的数据
        videoInfo: {},
        videoNum: {
            videoLen: 4,  // 每次加载视频课程的数量
            videoMax: 4  // 视频已加载的总量： 默认是4课
        },        
        sortTime: [],  // 记录最新文章列表最后一次加载的时间戳
        showBrief: false, // TAB的各个项目的简介
        briefInfo: {},
        noMoreText: ['到底了，记得1/3/5早9点有更新哟', '到底了，记得开盘日9点15更新哟'],
        canIUse: wx.canIUse('button.open-type.getUserInfo')
    },
    onShow: function () {
        const self = this;
        const { type, sort } = self.data;
        const userInfo = wx.getStorageSync('userInfo') || null;
        const isLogin = wx.getStorageSync('isLogin') || false;

        app.globalData.userInfo = userInfo;
        app.globalData.isLogin = isLogin;

        self.setData({
            userInfo: userInfo,
            isLogin: isLogin
        });

        self.isConcatHandler(type);
    },
    onHide () {
        const self = this;

        self.hiddenBrief();
    },
    onLoad: function (options) {
        const self = this;
        let { type, sort } = options;
        
        type = type || self.data.type;
        sort = sort || self.data.sort;
        //初始化，页面路径带有参数，默认显示对应的内容

        if (app.globalData.userInfo) {
            self.setData({
                userInfo: app.globalData.userInfo,
                type: type,
                sort: sort
            });
        } else if (self.data.canIUse) {
            // 由于 getUserInfo 是网络请求，可能会在 Page.onLoad 之后才返回
            // 所以此处加入 callback 以防止这种情况
            app.userInfoReadyCallback = res => {
                self.setData({
                    userInfo: app.globalData.userInfo,
                    type: type,
                    sort: sort
                });
            }
        } else {

        }
        
        // 初始化
        self.switchHandler(type);
    },
    //展示类型的切换： 0、摩研社； 1、摩股学院；
    changeType: function (e) {
        const self = this;
        const num = e.currentTarget.dataset.type;
        const tabStr = 'status.tabFlag';
        
        this.setData({
            type: num,
            sort: 0,
            [tabStr]: [true, true]
        });

        self.switchHandler(num);
        self.isConcatHandler(num);
    },
    //Tab滑动的时候change事件
    changeTab: function (e) {
        const self = this;
        const { current, currentItemId, source} = e.detail;
        const { type, sort, info } = self.data;
        const { tabFlag } = self.data.status;
        const { videoLen } = self.data.videoNum;
        const tabStr = 'status.tabFlag[' + sort +']';
        const videoMax = 'videoNum.videoMax';
        let sortNum = '';

        if(source === 'touch') {
            
            self.setData({
                sort: current,
                [tabStr]: false,
                [videoMax]: videoLen
            });

            if (type == 0) {

                // if (tabFlag[current]) {
                    self.latestArticlesHandler();
                    self.tryReadArticleHandler();
                // }

            } else if (type == 1) {

                if (tabFlag[current]) {  //  左右滑动的时候 不重新请求数据
                    self.collegeHandler();
                }
            }

            self.isConcatHandler(type);
        };
    },
    //0、摩研社； 1、摩股学院的数据请求
    switchHandler: function(num) {
        const self = this;
        let { sort } = self.data;
        const str = 'info['+ num +']';

        // //摩研社数据请求
        if (num == 0) {
            util.sendRequest(util.urls.mResearchIndex, {}, function (res) {
                if (res.data.code == util.ERR_OK) {
                    const d = res.data.result;

                    self.setData({
                        [str]: d
                    });

                    self.latestArticlesHandler();
                    self.tryReadArticleHandler();
                }
            });            
        } else if (num == 1) {
            util.sendRequest(util.urls.stockCollegeHome, {}, function (res) {
                if (res.data.code == util.ERR_OK) {
                    const d = res.data.result;

                    self.setData({
                        [str]: d
                    });

                    self.collegeHandler();
                }
            });  
        }
    },
    //试读文章数据请求
    tryReadArticleHandler: function () {
        const self = this;
        const { info, type, sort } = self.data;

        util.sendRequest(util.urls.tryReadArticles, { authorId: info[type].services[sort].authorId }, function (res) {
            if (res.data.code == util.ERR_OK) {
                const d = res.data.result;

                self.setData({
                    tryReadArticles: d
                });
            }
        });
    },
    //最新文章的数据请求
    latestArticlesHandler: function () {
        const self = this;
        const { latestArticles, sort, sortTime, info, type } = self.data;
        const str = 'latestArticles[' + sort + ']';
        const strTimes = 'sortTime[' + sort +']';

        wx.hideLoading();

        util.sendRequest(util.urls.latestArticles, {
            authorId: info[type].services[sort].authorId,
            sortTime: sortTime[sort] || ''
        }, function (res) {
            if (res.data.code == util.ERR_OK) {
                const d = res.data.result;
                const loading = 'status.loading[' + sort + ']';

                if (d.length > 0) {
                    self.setData({
                        [loading]: 0,
                        [str]: latestArticles[sort] ? latestArticles[sort].concat(d) : d,
                        [strTimes]: d.length > 0 ? d[d.length - 1].sortTime : sortTime[sort]
                    });
                } else {
                    self.setData({
                        [loading]: 2
                    });
                }

            } else {

            }
        }, function (res) {
            const loading = 'status.loading[' + sort + ']';

            wx.showLoading({
                title: '数据加载中',
            });

            self.switchHandler(type);
            self.setData({
                [loading]: 0
            });
        });
    },
    //课程目录
    collegeHandler: function() {
        const self = this;
        const { info, sort, type, videoInfo } = self.data;

        wx.showLoading({
            title: '加载中',
            mask: true
        });

        util.sendRequest(util.urls.stockCollegeVedioList, { courseId: info[type].services[sort].id }, function (res) {
            if (res.data.code == util.ERR_OK) {
                const d = res.data.result;
                const str = 'videoInfo.'+ sort;

                self.setData({
                    [str]: d
                });

                wx.hideLoading();
            }
        });
    },
    getVideo() {
        const { videoInfo, sort } = this.data;
        const { videoLen, videoMax } = this.data.videoNum;
        const max = 'videoNum.videoMax';

        if (videoMax < videoInfo[sort].videoList.length) {
            this.setData({
                [max]: videoLen + videoMax
            })
        } else {
            this.setData({
                [max]: videoLen
            })
        }
    },
    //展示Tab下的简介
    showDesc (e) {
        const self = this;
        const { type, sort, showBrief } = self.data;
        const keys = [110005, 110004];

        self.setData({
            showBrief: !showBrief,
            briefInfo: dataList.list[type][sort]
        });

        util.statistics(keys[sort], app);
    },
    hiddenBrief () {
        const self = this;

        self.setData({
            showBrief: false
        });
    },
    goToArticle: function(e) {
        const { id } = e.currentTarget;
        const { sort } = this.data;

        wx.navigateTo({
            url: `/pages/component/detail/detail?articleId=${id}&sort=${sort}`
        });
    },
    goToCourse: function(e) {
        const { id } = e.currentTarget;
        const { type, sort, info } = this.data;
        const videoType = info[type].services[sort].id;

        wx.navigateTo({
            url: `/pages/component/course/course?videoId=${id}&videoType=${videoType}&sort=${sort}`
        });
    },
    // 在调研通 默认是领取试读券，否则是联系客服
    isConcatHandler (num) {
        const self = this;
        let { sort, userInfo } = self.data;
        const isLogin = app.globalData.isLogin;

        if (num == 0 && sort == 0) { //是否在调研通频道
            if (isLogin) {
                
            } else {
                self.setData({
                    isContact: false
                });
            }
        } else {
            self.setData({
                isContact: true
            });
        }
    },
    onPullDownRefresh() { 
        const self = this;
        const { sort, type } = self.data;
        const str = 'status.loading[' + sort + ']';

        self.setData({
            [str]: 0,
            sortTime: [],
            latestArticles: {}
        });

        self.switchHandler(type);
        wx.stopPullDownRefresh();
    },
    onReachBottom () {
        const { type, sort, status } = this.data;
        const str = 'status.loading[' + sort +']';

        if( type == 0) {
            this.setData({
                [str]: 1
            });
            this.latestArticlesHandler();
        }
    },
    onShareAppMessage: function () {
        const { type, sort, info, staticFile } = this.data;
        const  titles = {
            0: ['调研通抢先试读券，免费领取中', '第一时间获取券商晨会秘钥'],
            1: ['一个向国内顶级私募学习的机会', '一套完整从低到高的缠论学习课程']
        };
        
        return {
            title: titles[type][sort],
            imageUrl: type == 0 ? `${staticFile}/share-${type}${sort}.jpg?ver=20180517`: '',
            path: `/pages/tabBar/index/index?type=${type}&sort=${sort}`
        }
    }
})
