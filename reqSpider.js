/*
    @by：十年之后 592885211@qq.com
    爬虫请求类
    使用免费代理
    逻辑：先不使用代理请求，当爬取拿不到结果或超时切换IP代理
*/
const request = require('request');

const cheerio = require('cheerio');

class reqSpider {
    constructor(option) {
        this.proxy_list = [];
        this.reConnt = 0;
        this.opt = Object.assign({
            method: 'GET',
            timeout: 120000, //2Mins
            rejectUnauthorized: false, //不检查证书
            reMax: 15 //只切换15次IP
        }, option);
    }

    run() {
        return new Promise((resolve, reject) => {
            const start = +new Date();

            request(this.opt, async (error, response, body) => {
                const end = +new Date();

                if (error || body.indexOf('502 Bad Gateway') > -1) { //根据业务情况来判断发现爬取会出现502报错
                    await this.set_proxy();
                    if (this.reConnt < this.opt.reMax) { //如果超过15次重复爬取，就不在重复，不然任务会一直卡死
                        this.reConnt++;
                        this.run();
                    } else {
                        reject(error);
                    }
                    return
                }

                this.reConnt = 0;

                resolve({ body, response, timeCon: end - start });
            })
        })
    }

    request(opts = {}) {
        const options = Object.assign({}, this.opt, opts);

        console.log('请求数据', options);

        return request(options, async (error, response, body) => {
            const {statusCode} = response || {};
            
            if (statusCode === 403) {
                console.log('IP被封');
            }

            if (error || statusCode === 403 || body.indexOf('502 Bad Gateway') > -1) { //根据业务情况来判断发现爬取会出现502报错
                await this.set_proxy();

                if (this.reConnt < this.opt.reMax) { //如果超过15次重复爬取，就不在重复，不然任务会一直卡死
                    this.reConnt++;

                    this.request(options);
                }

                return;
            }

            this.reConnt = 0;
        });
    }

    /*
        @测试代理IP是否可用
    */
    test_proxy(ip) {
        return new Promise((resolve, reject) => {
            console.log('测试代理', ip);

            request.get({
                url: 'https://www.baidu.com',
                proxy: 'https://' + ip
            }, (error, response, body) => {
                if (error) {
                    resolve(false);
                }

                resolve(true);
            });
        })
    }
    /*
        @检查代理
    */
    async check_ip() {
        console.log('检查代理');

        !this.proxy_list.length && (this.proxy_list = await this.get_proxy(50));

        // console.log('代理池', this.proxy_list);

        const ip = this.proxy_list.shift();
        const result = await this.test_proxy(ip); //true / false 测试IP是否可以使用

        if (result || !this.proxy_list.length) {
            return ip || null;
        } else {
            this.check_ip();
        }
    }
    /*
        设置代理
    */
    async set_proxy() {
        const proxy_ip = await this.check_ip();

        if (proxy_ip != undefined) {
            console.log('设置代理', proxy_ip);

            this.opt.proxy = proxy_ip;
        } else {
            await this.set_proxy();
        }
    }
    /*
        获取代理IP
    */
    get_proxy(n = 1) {
        //使用了http://www.66ip.cn/1.html 免费代理
        const getProxy = (p) => {
            return new Promise((resolve, reject) => {
                request.get({
                    url: `http://www.66ip.cn/${p}.html`
                }, (error, response, body) => {
                    if (error) {
                        return [];
                    }

                    const $ = cheerio.load(body);

                    const tr = $('table[bordercolor="#6699ff"]').find('tr');

                    const ips = [];

                    for (let i = 0; i < tr.length; i++) {
                        const ip = $(tr).eq(i).find('td').eq(0).text() + ':' + $(tr).eq(i).find('td').eq(1).text();

                        // 过滤ip
                        if (/(\d+\.?){4,4}:\d+/.test(ip)) {
                            ips.push(ip);
                        }
                    }

                    resolve(ips);
                })
            })
        };

        return new Promise(async (resolve, reject) => {
            try {
                const queue = [];

                for (let i = 0; i < n; i++) {
                    queue.push(await getProxy(i + 1));
                }

                const queueRes = await Promise.all(queue);

                const result = queueRes.reduce((prev, next) => prev = prev.concat(next), []);
                const proxyPool = [...new Set([...result])];

                console.log('代理池', proxyPool);

                resolve(proxyPool);
            } catch (e) {
                return [];
            }
        });
    }
}

module.exports = reqSpider;