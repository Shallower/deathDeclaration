const fs = require('fs'),
    path = require('path'),
    superagent = require("superagent"),
    cheerio = require("cheerio"),
    async = require("async");


const log = console.log;
const deathRowInfoUrl =  'https://www.tdcj.texas.gov/death_row/dr_executed_offenders.html'; // 主页url
const protocol = 'https://'
const prefixRrl = 'www.tdcj.texas.gov/death_row/';

const urlsArray = [];
const dataArr = [];

// 爬取首页信息得到url等内容
superagent.get(deathRowInfoUrl).end(function (err, pres) {
    // 常规的错误处理
    if (err) {
        log(err);
    }
    let $ = cheerio.load(pres.text);
    $('.tdcj_table.indent tr').each(function(){
        let td = $(this).eq(0).find('td');

        if (!td.eq(2).find('a').attr('href')) {
            return;
        }
        urlsArray.push(protocol + prefixRrl + td.eq(2).find('a').attr('href').replace(/\/death_row\//, ''));
        dataArr.push({
            execution: td.eq(0).text(),
            userInfoUrl:  protocol + prefixRrl + td.eq(1).find('a').attr('href').replace(/\/death_row\//, ''),
            lastStatement: protocol + prefixRrl + td.eq(2).find('a').attr('href').replace(/\/death_row\//, ''),
            name: td.eq(3).text() + ' ' + td.eq(4).text(),
            age: td.eq(6).text(),
            date: td.eq(7).text(),
        });
    });
    
    getInfo(urlsArray);
});

// getInfo(urlsArray);
// 获取信息
function getInfo() {
    let curCount = 0;  // 控制并发数
    let reptileMove = function (url, callback) {
        let delay = parseInt((Math.random() * 40000000) % 1000, 10);
        curCount++;
        log('现在的并发数是', curCount, '，正在抓取的是', url);

        superagent.get(url).end(function (err, sres) {
            if (err) {
                log(err);
                return;
            }
            
            let i = urlsArray.indexOf(url);
            dataArr[i]['lastStatement'] = cheerio.load(sres.text)('#content_right').find('p').eq(5).text();
            callback(null, i);
            log('获得成功', url);
            setTimeout(function () {
                curCount--;
            }, delay);
        });
    };

    // 使用async控制异步抓取  mapLimit(arr, limit, iterator, [callback]) 异步回调
    async.mapLimit(urlsArray, 8, function (url, callback) {
        reptileMove(url, callback);
    }, function (err, result) {
        if (err) log(err);
        log('爬取完成');
        setTimeout(function(){
            fs.writeFileSync('./data.js', JSON.stringify(dataArr, null, 4) , 'utf-8');
            log('写入完成');
        }, 0);
    });
}