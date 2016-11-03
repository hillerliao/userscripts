// ==UserScript==
// @name         只爱热门股
// @version      1.0
// @description  检查NEEQ官网的公告标题，如果含有列表中的股票名字，则高亮公告标题，并显示股票的热度值
// @author       hillerliao
// @match        http://www.neeq.com.cn/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

//股票的热度值，二维数组
var stocks = [ 
['九鼎集团', 1], 
['中科招商', 2],
['恒大淘宝',3],
['联讯证券',4],
['信中利',5],
['银都文化',100],
['九州证券',101],
['更多股票',102]
];

var titles = document.getElementsByTagName('em');

//检查是否包含股票名字
function hlStock() {
    //判断标题中是否包含列表中的股票名称
    for (var i = 0; i < stocks.length; i++) {

        var stock = stocks[i][0];

        for (var j = 0; j < titles.length; j++) {
            var title = titles[j];
            
            if (title.innerHTML.indexOf(stock) !== -1) {
                title.style.fontSize = 'large';
                title.style.color = 'red';
                if (document.getElementById(stocks[i][1])) {
                    title.style.color = 'red'; //有点费啊，不够优雅
                } else {
                    title.innerHTML = title.innerHTML + "<em id='" + stocks[i][1] + "' style='color:green'> 股票关注度:" + stocks[i][1] + "</em>";
                }
                
            } 
        }
    }
}

//翻页异步请求数据不刷新当前网址，需重复执行避免翻页后不检查
setInterval(hlStock,5000);