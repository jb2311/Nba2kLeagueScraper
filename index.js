const rp = require('request-promise');
const cheerio = require('cheerio');
const arrayToCsv = require('array-to-csv');
const drive = require('./google-drive-repository')


// cheerioTableparser = require('cheerio-tableparser');
const options = {
  uri: `https://2kleague.nba.com/game/bucks-gaming-vs-76ers-gc-5-11-2018/`,
  transform: function (body) {
    return cheerio.load(body);
  }
};

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

rp(options)
  .then(($) => {
    var homeTableHtml = findTable($,'table.home-players')
    var homeTable = parseTable($, homeTableHtml);

    var awayTableHtml = findTable($,'table.away-players')
    var awayTable = parseTable($, awayTableHtml);

    var homeCsv = arrayToCsv(homeTable);
    homeCsv = 'Name' + homeCsv;

    var awayCsv = arrayToCsv(awayTable);
    awayCsv = 'Name' + awayCsv;

    var csv = homeCsv + ',\n' + awayCsv;

    drive.promptLogin(csv);
  })
  .catch((err) => {
    console.log(err);
  });
  