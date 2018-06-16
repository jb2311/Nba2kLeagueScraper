const rp = require('request-promise');
const cheerio = require('cheerio');
const arrayToCsv = require('array-to-csv');
const drive = require('./google-drive-repository')
const nodeCache = require( "node-cache" );
const cache = new nodeCache({checkperiod: 604800});



function findTable($, tableName) {
  return $('.' + tableName + ' tr'); //'.table.table.home-players tr'
}
function parseTable($, htmlTable){
  var parsedTable = [];

  htmlTable.each(function(index, value){
    row = [];
    if(index == 0){
      $(value).find('th').each(function(i, v){
        row.push($(v).text());
      });
    } else {
      $(value).find('td').each(function(i, v){
        row.push($(v).text());
      });
    }
    parsedTable.push(row);
  });

  return parsedTable;
}
function findTeamName($, className){
  return $('.'+ className).text();
}

async function scrapeUrl(url){
  var html =  await rp(url); 

  return cheerio.load(html);
}

function getBoxScore($){
  var homeTableHtml = findTable($,'table.home-players') // TODO: put into config
  var homeTable = parseTable($, homeTableHtml);

  var awayTableHtml = findTable($,'table.away-players')
  var awayTable = parseTable($, awayTableHtml);

  var homeTeamName = findTeamName($, 'game-banner__name.home-team__name');
  var awayTeamName = findTeamName($, 'game-banner__name.away-team__name');

  var homeCsv = arrayToCsv(homeTable);
  homeCsv = 'Name' + homeCsv;

  var awayCsv = arrayToCsv(awayTable);
  awayCsv = 'Name' + awayCsv;

  var csv = homeCsv + ',\n' + awayCsv;

  return boxScoreData = {homeTeamName: homeTeamName, awayTeamName: awayTeamName, csv: csv, dateTime: new Date().toDateString()}
}

async function getUrls(){
  var $ = await scrapeUrl("https://2kleague.nba.com/schedule/");

  var scheduleBlocks = $('.schedule-block');
  var scheduleBlock;
  var date = new Date();
      scheduleBlocks.each((i, v) =>{
    if(new Date($(v).find('.schedule-block__header').first().children().first().text()).toDateString() 
      == date.toDateString()){
      scheduleBlock = v;
    }
  });

  var urls = [];

  if(scheduleBlock){
    var games = $(scheduleBlock).find('.schedule-block__game');
    games.each((i, v) => {
      if($(v).find('.game-status').text() == 'Final'){
        var url = $(v).find('.schedule-block__team').first().attr('href');
        var cachedResult = cache.get(url);
        if(!cachedResult){
          cache.set(url, true);
          urls.push(url);
        }
      }
    });
  }

  return urls;
}
async function run(){
  var urls = await getUrls();
  var boxScores = [];
  urls.forEach(async(url) => {
    var $ = await scrapeUrl(url);
    boxScores.push(getBoxScore($));
    drive.promptLogin(boxScoreData);
  });

  setTimeout(await run, 3600000)
}
run();
  