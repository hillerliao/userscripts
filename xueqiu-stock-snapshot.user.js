// ==UserScript==
// @name         雪球快照 (全场景适配-33.0)
// @namespace    http://tampermonkey.net/
// @version      33.0
// @description  解决 370742852 等专栏页面不注入问题，强化时间提取和容器定位
// @author       Gemini
// @match        *://xueqiu.com/*
// @grant        GM_xmlhttpRequest
// @connect      stock.xueqiu.com
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    function formatPrice(price) {
        if (typeof price !== 'number' || isNaN(price)) return '--';
        return price < 1 ? price.toFixed(3) : price.toFixed(2);
    }

    // 针对专栏页面的超级时间提取器
    function getPostTimestamp() {
        // 1. 尝试从专栏特有的时间类名中提取
        const timeEl = document.querySelector('.article__bd__from, .status-item__date, .time');
        if (timeEl) {
            const tText = timeEl.innerText.match(/\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}/);
            if (tText) return new Date(tText[0].replace(/-/g, '/')).getTime();
        }

        // 2. 尝试正则匹配全文
        const bodyText = document.body.innerText;
        const timeMatch = bodyText.match(/(发布于\s*)?(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2})/);
        if (timeMatch) return new Date(timeMatch[2].replace(/-/g, '/')).getTime();

        // 3. 兜底从数据层提取
        try {
            const nextData = JSON.parse(document.getElementById('__NEXT_DATA__').textContent);
            const p = nextData.props.pageProps;
            return p.status?.created_at || p.detail?.created_at || p.article?.created_at || p.status?.time;
        } catch(e) {}
        return null;
    }

    function showTooltip(linkEl, data) {
        let tooltip = document.getElementById('xq-snapshot-tooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'xq-snapshot-tooltip';
            tooltip.style = `position:fixed; z-index:1000000; background:white; border-radius:6px; box-shadow:0 8px 20px rgba(0,0,0,0.2); padding:12px; font-size:13px; pointer-events:none; transition:opacity 0.15s; opacity:0; border:1px solid #ebeef5; line-height:1.6; min-width:170px; color:#303133;`;
            document.body.appendChild(tooltip);
        }

        const { name, symbol, oldP, currP, percent } = data;
        const color = percent >= 0 ? '#ef5350' : '#26a69a';
        tooltip.innerHTML = `
            <div style="font-weight:bold; border-bottom:1px solid #f2f6fc; margin-bottom:8px; padding-bottom:6px; font-size:14px;">
                ${name} <span style="font-size:11px; color:#909399; font-weight:normal;">${symbol}</span>
            </div>
            <div style="display:flex; justify-content:space-between;"><span>发帖价:</span><b>${formatPrice(oldP)}</b></div>
            <div style="display:flex; justify-content:space-between;"><span>实时价:</span><b>${formatPrice(currP)}</b></div>
            <div style="display:flex; justify-content:space-between; margin-top:6px; padding-top:6px; border-top:1px dashed #ebeef5;">
                <span>涨跌幅:</span><b style="color:${color}; font-size:14px;">${percent >= 0 ? '+' : ''}${percent}%</b>
            </div>`;

        const rect = linkEl.getBoundingClientRect();
        let left = rect.left;
        if (left + 200 > window.innerWidth) left = window.innerWidth - 210;
        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${rect.bottom + 8}px`;
        tooltip.style.opacity = '1';
    }

    function main() {
        const timestamp = getPostTimestamp();
        if (!timestamp) return;

        // 这里的选择器几乎覆盖了雪球所有正文形态
        const allLinks = document.querySelectorAll('a[href*="/S/"]:not([data-snapshot-done])');

        allLinks.forEach(link => {
            // 确保只在内容区域
            const isContent = link.closest('.article__bd__detail, .article__content, .status-content, .post__body, article, .content');
            if (!isContent) return;

            const symbolMatch = link.href.match(/\/S\/([A-Z0-9]+)/);
            if (!symbolMatch) return;
            const symbol = symbolMatch[1];
            link.setAttribute('data-snapshot-done', 'true');

            const rawText = link.innerText.trim();
            const fallbackName = rawText.replace(/\$|\(.*?\)/g, '').trim();

            GM_xmlhttpRequest({
                method: "GET",
                url: `https://stock.xueqiu.com/v5/stock/chart/kline.json?symbol=${symbol}&begin=${timestamp}&period=day&type=before&count=-1&indicator=kline`,
                onload: (resH) => {
                    const hData = JSON.parse(resH.responseText);
                    const hItem = hData.data?.item?.[0];
                    if (!hItem) return;
                    const oldPrice = parseFloat(hItem[5]);

                    GM_xmlhttpRequest({
                        method: "GET",
                        url: `https://stock.xueqiu.com/v5/stock/realtime/quotec.json?symbol=${symbol}`,
                        onload: (resC) => {
                            const cData = JSON.parse(resC.responseText);
                            const info = cData.data?.[0] || {};
                            if (!isNaN(oldPrice)) {
                                const currPrice = info.current || info.last_close;
                                const percent = ((currPrice - oldPrice) / oldPrice * 100).toFixed(2);
                                const data = { name: info.name || fallbackName, symbol, oldP: oldPrice, currP: currPrice, percent };

                                if (rawText.includes('$')) injectPercentBadge(link, percent);
                                link.addEventListener('mouseenter', () => showTooltip(link, data));
                                link.addEventListener('mouseleave', () => {
                                    const t = document.getElementById('xq-snapshot-tooltip');
                                    if(t) t.style.opacity = '0';
                                });
                                link.style.cursor = 'pointer';
                            }
                        }
                    });
                }
            });
        });
    }

    function injectPercentBadge(linkEl, percent) {
        const badge = document.createElement('span');
        const color = percent >= 0 ? '#ef5350' : '#26a69a';
        badge.style = `display:inline-flex; align-items:center; justify-content:center; background:${percent >= 0 ? '#fff5f5' : '#f0f9f6'}; border:1px solid ${percent >= 0 ? '#ffcfcf' : '#c2e5d9'}; color:${color}; padding:0px 5px; border-radius:4px; font-size:11px; margin-left:5px; font-weight:bold; font-family:monospace; height:18px; line-height:1; vertical-align:middle;`;
        badge.innerHTML = `${percent >= 0 ? '+' : ''}${percent}%`;
        linkEl.appendChild(badge);
    }

    setTimeout(main, 1000);
    setInterval(main, 3500);
})();
