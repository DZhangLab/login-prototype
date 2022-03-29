const accountSid = process.env.TWILLOSID;
const authToken = process.env.TWILLOWTOKEN;
const client = require('twilio')(accountSid, authToken);

client.messages
  .create({
     body: 'This is the ship that made the Kessel Run in fourteen parsecs?',
     from: '+17657538135',
     to: '+12015771959'
   })
  .then(message => console.log(message.status));
