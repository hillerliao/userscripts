// ==UserScript==
// @name         Bilibili Auto Skip to Last Four Minutes for Anime Videos
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Automatically skip to the last four minutes of a Bilibili video if it is tagged as an anime or contains a specific tag link
// @author       Your Name
// @match        *://*.bilibili.com/video/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 等待页面加载
    window.addEventListener('load', function() {
        // 检查script标签内容中是否包含"动画"标签
        var scriptTags = document.getElementsByTagName('script');
        var isAnimeByTag = false;
        for (var i = 0; i < scriptTags.length; i++) {
            var scriptContent = scriptTags[i].textContent;
            if (scriptContent.includes('"tag_name":"动画短片"') || scriptContent.includes('"tag_name":"动画"')) {
                isAnimeByTag = true;
                break;
            }
        }

        // 检查页面中是否存在特定的div元素
        var isAnimeByLink = document.querySelector('div.firstchannel-tag a.tag-link[href*="douga/"]').textContent === '动画' || document.querySelector('div.firstchannel-tag a.tag-link[href*="douga/"]').textContent === '动画片';

        // 如果任一条件满足，则跳转到视频的最后四分钟
        if (isAnimeByTag || isAnimeByLink) {
            var player = document.querySelector('video');
            if (player) {
                player.addEventListener('loadedmetadata', function() {
                    var duration = player.duration;
                    var skipTime = Math.max(duration - 4 * 60, 0);
                    player.currentTime = skipTime;
                });
            }
        }
    });
})();
