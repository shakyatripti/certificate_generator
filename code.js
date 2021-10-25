//node code.js --url=https://www.hackerrank.com/ --config=config.json --excel=datafile.csv

let minimist = require("minimist");
let fs = require("fs");
let puppeteer = require("puppeteer");
let axios = require("axios");
let pdf = require("pdf-lib");
let excel4node = require("excel4node");
let jsdom = require("jsdom");
const { rgb } = require("pdf-lib");
const { clearScreenDown } = require("readline");
let args = minimist(process.argv);
let configJson = fs.readFileSync(args.config, "utf-8");
let config = JSON.parse(configJson);

async function start() {
   let browser = await puppeteer.launch({
      headless: false,
      args: ['--start-fullscreen'],
      defaultViewport: null
   });
   let pages = await browser.pages();
   let page = pages[0];
   await pages[0].goto(args.url);

   await page.waitForSelector("a[data-event-action='Login']");
   await page.click("a[data-event-action='Login']");

   //2nd login page of HackerRank
   await page.waitForSelector("a[href='https://www.hackerrank.com/login']");
   await page.click("a[href='https://www.hackerrank.com/login']")

   //enter username
   await page.waitForSelector("input[name='username']");
   await page.type("input[name='username']", config.username, { delay: 100 });

   //enter password
   await page.waitForSelector("input[name='password']");
   await page.type("input[name='password']", config.password, { delay: 100 });

   //click on login button
   await page.waitForSelector("button[data-analytics='LoginPassword']");
   await page.click("button[data-analytics='LoginPassword']");
   await page.waitFor(1000);

   //go to leaderboard
   await page.waitForSelector("a[data-analytics='NavBarLeaderboard']");
   await page.click("a[data-analytics='NavBarLeaderboard']");
   await page.waitFor(2000);

   async function handleuser(page, browser) {
      let fullname = [];
      await page.waitForSelector("a[data-analytics='LeaderboardListUserName']");
      let links = await page.$$eval("a[data-analytics='LeaderboardListUserName']", function (atags) {
         let names = [];
         for (let i = 0; i < atags.length; i++) {
            let userid = atags[i].getAttribute("data-value");
            names.push(userid);
         }
         return names;
      });
      for (let i = 0; i < links.length; i++) {
         let ctab = await browser.newPage();
         await ctab.bringToFront();
         await ctab.goto(args.url + links[i], { delay: 2000 });
         fullname.push(links[i]);
         await ctab.waitFor(2000);
         await ctab.close();
         await page.waitFor(1000);
      }
      prepareExcel(fullname, args.excel);
      createScoreCard(fullname);
   }
   
   //stores userids in excel
   handleuser(page, browser);
   function prepareExcel(fullname, excelFileName) {
      let wb = new excel4node.Workbook();
      let tsheet = wb.addWorksheet("Top 20");
      for (let i = 0; i < fullname.length; i++) {
         tsheet.cell(1 + i, 1).string(fullname[i]);
      }
      wb.write(excelFileName);
   }
   
   //creates certificate pdfs for each user
   function createScoreCard(fullname) {
      for (let i = 0; i < fullname.length; i++) {
         let templateFileBytes = fs.readFileSync("Template.pdf");
         let pdfdocPromise = pdf.PDFDocument.load(templateFileBytes);
         pdfdocPromise.then(function (pdfdoc) {
            let page = pdfdoc.getPage(0);
            page.drawText(fullname[i], {
               x: 360,
               y: 338,
               width: 100,
               height: 100,
               color: rgb(1, 0.59, 0)
            });
            let changedBytesPromise = pdfdoc.save();
            changedBytesPromise.then(function (changedBytes) {
               if (fs.existsSync(fullname[i] + ".pdf") == true) {
                  fs.writeFileSync(fullname[i] + "1.pdf", changedBytes);
               }
               else {
                  fs.writeFileSync(fullname[i] + ".pdf", changedBytes);
               }
            })
         })
      }
   }
}
start();
