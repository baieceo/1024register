const fs = require('fs');
const reqSpider = require('./reqSpider.js');
const spider = new reqSpider();

const fetchCodeImg = () => {
    return new Promise(async (resolve, reject) => {
        try {
            const codeimg = await spider.request({
                url: 'https://cl.8715x.xyz/require/codeimg.php'
            });

            const ws = fs.createWriteStream('./code.png');

            codeimg.pipe(ws);

            ws.on('finish', () => {
                ws.close();

                resolve();
            });

            ws.on('error', reject);
        } catch (e) {
            console.error('获取验证码异常', e);

            reject(e);
        }
    });
}

(async () => {
    try {
        await fetchCodeImg();

        const list = await spider.get_proxy(5);

    } catch (e) {
        console.error('程序异常', e);
    }
})();