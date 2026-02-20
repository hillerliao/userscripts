// ==UserScript==
// @name         雪球快照 (悬停全覆盖+精准注入)
// @namespace    http://tampermonkey.net/
// @version      29.0
// @description  无论是否带$符号均支持悬停显示，但仅在$代码$格式后注入涨跌幅标签
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

    function getPostTimestamp() {
        const bodyText = document.body.innerText;
        const timeMatch = bodyText.match(/发布于\s*(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2})/);
        if (timeMatch) return new Date(timeMatch[1].replace(/-/g, '/')).getTime();
        try {
            const nextData = JSON.parse(document.getElementById('__NEXT_DATA__').textContent);
            return nextData.props.pageProps.status?.created_at || nextData.props.pageProps.detail?.created_at;
        } catch(e) {}
        return null;
    }

    function showTooltip(linkEl, data) {
        let tooltip = document.getElementById('xq-snapshot-tooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'xq-snapshot-tooltip';
            tooltip.style = `
                position: fixed; z-index: 1000000; background: white;
                border-radius: 6px; box-shadow: 0 8px 20px rgba(0,0,0,0.15);
                padding: 12px; font-size: 13px; pointer-events: none;
                transition: opacity 0.2s; opacity: 0; border: 1px solid #ebeef5;
                line-height: 1.6; min-width: 170px; color: #303133;
            `;
            document.body.appendChild(tooltip);
        }

        const { name, symbol, oldP, currP, percent } = data;
        const color = percent >= 0 ? '#ef5350' : '#26a69a';

        tooltip.innerHTML = `
            <div style="font-weight:bold; border-bottom:1px solid #f2f6fc; margin-bottom:8px; padding-bottom:6px; font-size:14px;">
                ${name} <span style="font-size:11px; color:#909399; font-weight:normal;">${symbol}</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
                <span style="color:#606266;">发帖时股价:</span> <b style="font-family:monospace;">${formatPrice(oldP)}</b>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
                <span style="color:#606266;">当前实时价:</span> <b style="font-family:monospace;">${formatPrice(currP)}</b>
            </div>
            <div style="display:flex; justify-content:space-between; margin-top:6px; padding-top:6px; border-top:1px dashed #ebeef5;">
                <span style="color:#606266;">迄今总收益:</span> <b style="color:${color}; font-family:monospace; font-size:14px;">${percent >= 0 ? '+' : ''}${percent}%</b>
            </div>
        `;

        const rect = linkEl.getBoundingClientRect();
        // 智能定位：防止超出屏幕右侧
        let left = rect.left;
        if (left + 180 > window.innerWidth) left = window.innerWidth - 190;

        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${rect.bottom + 8}px`;
        tooltip.style.opacity = '1';
    }

    function hideTooltip() {
        const tooltip = document.getElementById('xq-snapshot-tooltip');
        if (tooltip) tooltip.style.opacity = '0';
    }

    function main() {
        const timestamp = getPostTimestamp();
        if (!timestamp) return;

        // 扫描所有股票链接
        const allLinks = document.querySelectorAll('a[href*="/S/"]:not([data-snapshot-done])');

        allLinks.forEach(link => {
            const isContent = link.closest('.article__content, .status-content, .post__body, article, .content, [class*="content"]');
            if (!isContent) return;

            const symbolMatch = link.href.match(/\/S\/([A-Z0-9]+)/);
            if (!symbolMatch) return;
            const symbol = symbolMatch[1];

            // 标记已处理，防止重复请求
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

                                // 【逻辑分水岭】
                                // 1. 只有文本包含 $ 时，才注入涨跌幅标签
                                if (rawText.includes('$')) {
                                    injectPercentBadge(link, percent);
                                }

                                // 2. 无论什么格式，都绑定悬停事件
                                link.addEventListener('mouseenter', () => showTooltip(link, data));
                                link.addEventListener('mouseleave', hideTooltip);
                                // 增加平滑支持
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
        const bgColor = percent >= 0 ? '#fff5f5' : '#f0f9f6';
        const borderColor = percent >= 0 ? '#ffcfcf' : '#c2e5d9';

        badge.style = `
            display: inline-flex; align-items: center; justify-content: center;
            background: ${bgColor}; border: 1px solid ${borderColor};
            color: ${color}; padding: 0px 5px; border-radius: 4px; font-size: 11px;
            margin-left: 5px; font-weight: bold; font-family: monospace;
            height: 18px; line-height: 1; vertical-align: middle;
        `;
        badge.innerHTML = `${percent >= 0 ? '+' : ''}${percent}%`;

        linkEl.style.display = 'inline-flex';
        linkEl.style.alignItems = 'center';
        linkEl.style.textDecoration = 'none';
        linkEl.appendChild(badge);
    }

    setTimeout(main, 1500);
    setInterval(main, 3500);
})();
