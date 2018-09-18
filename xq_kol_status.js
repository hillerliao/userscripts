// ==UserScript==
// @name         段永平最新主贴
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Fetch KOL's posts and send them to a Dingding group.
// @author       Piller Liao
// @match        https://xueqiu.com/*
// @grant        GM.xmlHttpRequest
// ==/UserScript==

(function() {
    'use strict';

    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("GET", "https://xueqiu.com/v4/statuses/user_timeline.json?page=1&user_id=1247347556&_=1537018651096", false);
    xmlhttp.send();
    var data = JSON.parse(xmlhttp.responseText);
    var description = '';
    var screen_name = "@" + data.statuses[0].user.screen_name + '：';
    var latest_status_time = data.statuses[0].created_at;
    // console.log(latest_status_time);

    if (localStorage.getItem("last_scrapy_time") === null) {
        localStorage.setItem("last_scrapy_time", 1536107821000);
    }

    var last_scrapy_time = localStorage.getItem("last_scrapy_time") ;
    // console.log(last_scrapy_time);
    // console.log( latest_status_time > Number(last_scrapy_time));

    if( latest_status_time > last_scrapy_time){

        for(var i in data.statuses){
            description = data.statuses[i].description.replace(/<\/?[^>]+(>|$)/g, "");
            if (data.statuses[i].retweeted_status != null){
                var retweeted_status = "//@" + data.statuses[i].retweeted_status.user.screen_name + '：' + data.statuses[i].retweeted_status.title + " " + data.statuses[i].retweeted_status.description.replace(/<\/?[^>]+(>|$)/g, "");
                description += retweeted_status;
            }

            //var payload = {"text" : screen_name + '：' + description };
            var payload = {"msgtype": "text", "text": {"content": screen_name + description } };
            wait(1000);
            // console.log(new Date());
            // console.log(description);
            sender("Your Dingding Token"); // 传入钉钉token参数

        }

        localStorage.setItem("last_scrapy_time", Date.now()); //更新抓取时间


    }



    function sender(dd_token){
        GM.xmlHttpRequest({
                method: "POST",
                url: "https://oapi.dingtalk.com/robot/send?access_token=" + dd_token,
                data: JSON.stringify(payload),
                headers: {
                    "Content-Type": "application/json"
                },
                onload:  function (response) {
                    console.log (response.responseText);
                }
            });
    }

    function wait(ms){
        var start = new Date().getTime();
        var end = start;
        while(end < start + ms) {
         end = new Date().getTime();
  }
}


})();

