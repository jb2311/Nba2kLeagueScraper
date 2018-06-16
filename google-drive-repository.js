const {google} = require('googleapis');
const fs = require('fs');
const readline = require('readline');
const rp = require('request-promise');

const SCOPES = ['https://www.googleapis.com/auth/drive'];
const TOKEN_PATH = './credentials.json';


async function promptLogin(boxScoreData){
  fs.readFile('./google-client-id.json', (err, content) => {
  if (err) return console.log('Error loading client secret file:', err);
  // Authorize a client with credentials, then call the Google Drive API.
  authorize(JSON.parse(content), uploadSheet, boxScoreData);
  });
}
function authorize(credentials, callback, csv) {
  const {client_secret, client_id, redirect_uris} = credentials.web;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, 'https://www.google.com/');

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getAccessToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client, csv);
  });
}
function getAccessToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return callback(err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}
function GetFileName(boxScoreData){
  return boxScoreData.awayTeamName + ' vs ' + boxScoreData.homeTeamName + ' - ' + boxScoreData.dateTime;
}
 
async function getFolderList(drive){
  var response = await  drive.files.list({
      q: "mimeType='application/vnd.google-apps.folder' AND name = '" + new Date().toDateString() +"'"
    });
  return response.data.files;
}

async function getFolderId(drive){
  var folders =  await getFolderList(drive);

  if(folders.length > 0){
    return folders[0].id;
  }

  var id;
  var fileMetadata = {
    'name': new Date().toDateString(),
    'mimeType': 'application/vnd.google-apps.folder'
  };
  drive.files.create({
    resource: fileMetadata,
    fields: 'id'
  }, function (err, file) {
    if (err) {
      // Handle error
      console.error(err);
    } else {
     id = file.data.id;
    }
  });
  return id;
}
async function uploadSheet(auth, boxScoreData) {
  const drive = google.drive({version: 'v3', auth});
  
  var folderId = await getFolderId(drive);

  var fileMetadata = {
    'name': GetFileName(boxScoreData),
    'mimeType': 'application/vnd.google-apps.spreadsheet',
    parents: [folderId]
  };
  var media = {
    mimeType: 'text/csv',
    body: boxScoreData.csv
  };
  drive.files.create({
    resource: fileMetadata,
    media: media,
    fields: 'id'
  }, function (err, file) {
    if (err) {
      // Handle error
      console.error(err);
    } else {
      console.log('File Id:', file.data.id);
    }
  });
}
module.exports.promptLogin = promptLogin;