'use strict';

//get libraries
const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const path = require('path')

//create express web-app
const app = express();
const router = express.Router();

//get the libraries to call
//var network = require('./network/network.js');
var validate = require('./../web-app/public/scripts/validate.js');
//var analysis = require('./network/analysis.js');

//custom to fabric
const { FileSystemWallet, Gateway, X509WalletMixin } = require('fabric-network');
const ccpPath = path.resolve(__dirname, '..', '..', 'first-network', 'connection-org1.json');

//bootstrap application settings
app.use(express.static('./../web-app/public'));
app.use('/scripts', express.static(path.join(__dirname, '/../web-app/public/scripts')));
app.use(bodyParser.json());

//get home page
app.get('/home', function(req, res) {
  res.sendFile(path.join(__dirname + '/../web-app/public/index.html'));
});

//get member page
app.get('/member', function(req, res) {
  res.sendFile(path.join(__dirname + '/../web-app/public/member.html'));
});

//get member registration page
app.get('/registerMember', function(req, res) {
  res.sendFile(path.join(__dirname + '/../web-app/public/registerMember.html'));
});

//get partner page
app.get('/partner', function(req, res) {
  res.sendFile(path.join(__dirname + '/../web-app/public/partner.html'));
});

//get partner registration page
app.get('/registerPartner', function(req, res) {
  res.sendFile(path.join(__dirname + '/../web-app/public/registerPartner.html'));
});

//get about page
app.get('/about', function(req, res) {
  res.sendFile(path.join(__dirname + '/../web-app/public/about.html'));
});

//post call to register partner on the network
app.post('/api/registerPartner', function(req, res) {

  //declare variables to retrieve from request
  var name = req.body.name;
  var partnerId = req.body.partnerid;
  var cardId = req.body.cardid;

  //print variables
  console.log('Using param - name: ' + name + ' partnerId: ' + partnerId + ' cardId: ' + cardId);

  //validate partner registration fields
  validate.validatePartnerRegistration(partnerId, cardId, name)
    .then((response) => {
      //return error if error in response
      if (response.error != null) {
        res.json({
          error: response.error
        });
        return;
      } else {
        //else register partner on the network
        regPartner(partnerId, cardId, name)
          .then((response) => {
            //return error if error in response
            if (response.error != null) {
              res.json({
                error: response.error
              });
            } else {
              //else return success
              res.json({
                success: response
              });
            }
          });
      }
    });

});

//post call to retrieve partner data and transactions data from the network
app.post('/api/partnerData', function(req, res) {

  //declare variables to retrieve from request
  var partnerId = req.body.partnerid;
  var cardId = req.body.cardid;

  //print variables
  console.log('partnerData using param - ' + ' partnerId: ' + partnerId + ' cardId: ' + cardId);

  //declare return object
  var returnData = {};

  //get partner data from network
  getPartner(partnerId,cardId)
    .then((partner) => {
      var dataPartner = JSON.parse(partner.result);
      //return error if error in response
      console.log("partner get 1");
      if (partner.error != null) {
        console.log("partner get 2");
        res.json({
          error: partner.error
        });
      } else {
        console.log("partner get 3",partner);
        console.log("partner get 5",dataPartner);
        //else add partner data to return object
        returnData.id = dataPartner.accountNumber;
        returnData.name = dataPartner.name;
        returnData.pointsGiven = dataPartner.pointAllocate;
        returnData.pointsCollected = dataPartner.pointRedeem;
        console.log("partner get 5 end");
      }

    }).then(()=>{
      getHist(partnerId,cardId,'partner').then((resData)=>{
        console.log("end get history");
        console.log("resData123 ",resData);
        console.log("resData122 ",JSON.parse(resData.result));
        var dat = JSON.parse( resData.result);

        returnData.usePointsResults = dat.usePointsResults;
        returnData.earnPointsResult = dat.earnPointsResults;
        res.json(returnData);
      });
    });
    

});



//post call to retrieve member data, transactions data and partners to perform transactions with from the network
app.post('/api/memberData', function(req, res) {

  //declare variables to retrieve from request
  var accountNumber = req.body.accountnumber;
  var cardId = req.body.cardid;

  //print variables
  console.log('memberData using param - ' + ' accountNumber: ' + accountNumber + ' cardId: ' + cardId);

  //declare return object
  var returnData = {};

  //get member data from network
  getMember(accountNumber,cardId).then((member) => {
    
    var dataMember = JSON.parse(member.result);
    
    //return error if error in response
    if (member.error != null) {
      res.json({
        error: member.error
      });
    } else {
      //else add member data to return object
      returnData.accountNumber = dataMember.accountNumber;
      returnData.firstName = dataMember.firstName;
      returnData.lastName = dataMember.lastName;
      returnData.phoneNumber = dataMember.phoneNumber;
      returnData.email = dataMember.email;
      returnData.points = dataMember.point;
    }

    
    
  }).then(()=>{
      
      getAllPartner(accountNumber,cardId).then((partner)=>{
        var dataPartner = JSON.parse(partner.result);
        returnData.partnersData = [];

        //return error if error in response
        if (partner.error != null) {
          res.json({
            error: partner.error
          });
        } else {

          for (var i = 0; i < dataPartner.length; i++) {
           // var testPartner = JSON.parse( dataPartner[i]);
            console.log(i,dataPartner[i].Key);
            console.log(i+'t',dataPartner[i].Record.name);
            returnData.partnersData.push({id:dataPartner[i].Key,name:dataPartner[i].Record.name});
          }
          
         
        }

       
      }).then(()=>{
        getHist(accountNumber,cardId,'member').then((resData)=>{
          console.log("end get history");
          console.log("resData123 ",resData);
          console.log("resData122 ",JSON.parse(resData.result));
          var dat = JSON.parse( resData.result);

          returnData.usePointsResults = dat.usePointsResults;
          returnData.earnPointsResult = dat.earnPointsResults;
          res.json(returnData);
        });
      });
  });
  
  
});


//post call to perform UsePoints transaction on the network
app.post('/api/usePoints', function(req, res) {

  //declare variables to retrieve from request
  var accountNumber = req.body.accountnumber;
  var cardId = req.body.cardid;
  var partnerId = req.body.partnerid;
  var points = parseFloat(req.body.points);

  //print variables
  console.log('Using param - points: ' + points + ' partnerId: ' + partnerId + ' accountNumber: ' + accountNumber + ' cardId: ' + cardId);

  //validate points field
  validate.validatePoints(points)
    //return error if error in response
    .then((checkPoints) => {
      if (checkPoints.error != null) {
        res.json({
          error: checkPoints.error
        });
        return;
      } else {
        points = checkPoints;
        //else perforn UsePoints transaction on the network
        doUsePoint(accountNumber,cardId,points,partnerId).then((response) => {
          //return error if error in response
          console.log("A",response);
          if (response.error != null) {
            console.log("B",response);
            res.json({
              error: response.error
            });
          } else {
            console.log("C",response);
            //else return success
            res.json({
              success: response
            });
          }
        });
      }
    });

});


//post call to perform EarnPoints transaction on the network
app.post('/api/earnPoints', function(req, res) {

  //declare variables to retrieve from request
  var accountNumber = req.body.accountnumber;
  var cardId = req.body.cardid;
  var partnerId = req.body.partnerid;
  var points = parseFloat(req.body.points);

  //print variables
  console.log('Using param - points: ' + points + ' partnerId: ' + partnerId + ' accountNumber: ' + accountNumber + ' cardId: ' + cardId);

  //validate points field
  validate.validatePoints(points)
    .then((checkPoints) => {
      //return error if error in response
      if (checkPoints.error != null) {
        res.json({
          error: checkPoints.error
        });
        return;
      } else {
        points = checkPoints;
        //else perforn EarnPoints transaction on the network
        doEarnPoint(accountNumber,cardId,points,partnerId).then((response) => {
          //return error if error in response
          console.log("A",response);
          if (response.error != null) {
            console.log("B",response);
            res.json({
              error: response.error
            });
          } else {
            console.log("C",response);
            //else return success
            res.json({
              success: response
            });
          }
        });
      }
    });

});


//post call to perform create course transaction on the network
app.post('/api/createCourse', function(req, res) {

  //declare variables to retrieve from request
  var partnerId = req.body.partnerid;
  var cardid = reg.body.cardid;
  // var points = parseFloat(req.body.points);
  console.log("why");
  //print variables
  // console.log('Using param - points: ' + points + ' partnerId: ' + partnerId + ' accountNumber: ' + accountNumber + ' cardId: ' + cardId);

  doCreateCourse(partnerId,cardid).then((response) => {
    if (response.error != null) {
      console.log("B",response);
      res.json({
        error: response.error
      });
    } else {
      console.log("C",response);
      //else return success
      res.json({
        success: response
      });
    }
  });

});



//post call to perform UsePoints transaction on the network
app.post('/api/usePoints', function(req, res) {

  //declare variables to retrieve from request
  var accountNumber = req.body.accountnumber;
  var cardId = req.body.cardid;
  var partnerId = req.body.partnerid;
  var points = parseFloat(req.body.points);

  //print variables
  console.log('Using param - points: ' + points + ' partnerId: ' + partnerId + ' accountNumber: ' + accountNumber + ' cardId: ' + cardId);

  //validate points field
  validate.validatePoints(points)
    //return error if error in response
    .then((checkPoints) => {
      if (checkPoints.error != null) {
        res.json({
          error: checkPoints.error
        });
        return;
      } else {
        points = checkPoints;
        //else perforn UsePoints transaction on the network
        network.usePointsTransaction(cardId, accountNumber, partnerId, points)
          .then((response) => {
            //return error if error in response
            if (response.error != null) {
              res.json({
                error: response.error
              });
            } else {
              //else return success
              res.json({
                success: response
              });
            }
          });
      }
    });


});


//post call to register member on the network
app.post('/api/registerMember', function(req, res) {
  console.log('123454');
  //declare variables to retrieve from request
  var accountNumber = req.body.accountnumber;
  var cardId = req.body.cardid;
  var firstName = req.body.firstname;
  var lastName = req.body.lastname;
  var email = req.body.email;
  var phoneNumber = req.body.phonenumber;

  //print variables
  console.log('Using param - firstname: ' + firstName + ' lastname: ' + lastName + ' email: ' + email + ' phonenumber: ' + phoneNumber + ' accountNumber: ' + accountNumber + ' cardId: ' + cardId);

  //validate member registration fields
  validate.validateMemberRegistration(cardId, accountNumber, firstName, lastName, email, phoneNumber)
    .then((response) => {
      console.log('1');
      //return error if error in response
      if (response.error != null) {
        console.log('2');
        res.json({
          error: response.error
        });
        return;
      } else {
        console.log('3');
        //register process

          regMember(accountNumber,cardId,firstName,lastName,email,phoneNumber).then((response) => {
            console.log("response",response);
            //return error if error in response
            if (response.error != null) {
              console.log("a");
              res.json({
                error: response.error
              });
            } else {
              console.log("b");
              //else return success
              res.json({
                success: response
              });
            }
          });

      }
    });


});


//declare port
var port = process.env.PORT || 8000;
if (process.env.VCAP_APPLICATION) {
  port = process.env.PORT;
}

//run app on port
app.listen(port, function() {
  console.log('app running on port: %d', port);
});


async function regMember(accountNumber,cardId,firstName,lastName,email,phoneNumber) {
  var response = {};
  response.error = "";

  try {

    // Create a new file system based wallet for managing identities.
    const walletPath = path.join(process.cwd(), 'wallet');
    const wallet = new FileSystemWallet(walletPath);
    console.log(`Wallet path: ${walletPath}`);

    // Check to see if we've already enrolled the user.
    const userExists = await wallet.exists('member_'+accountNumber+'_'+cardId);
    if (userExists) {
        console.log('An identity for the user "'+'member_'+accountNumber+'_'+cardId+'" already exists in the wallet');
        return;
    }

    // Check to see if we've already enrolled the admin user.
    const adminExists = await wallet.exists('admin');
    if (!adminExists) {
        console.log('An identity for the admin user "admin" does not exist in the wallet');
        console.log('Run the enrollAdmin.js application before retrying');
        return;
    }

    // Create a new gateway for connecting to our peer node.
    const gateway = new Gateway();
    await gateway.connect(ccpPath, { wallet, identity: 'admin', discovery: { enabled: true, asLocalhost: true } });

    // Get the CA client object from the gateway for interacting with the CA.
    const ca = gateway.getClient().getCertificateAuthority();
    const adminIdentity = gateway.getCurrentIdentity();

    // Register the user, enroll the user, and import the new identity into the wallet.
    const secret = await ca.register({ affiliation: 'org1.department1', enrollmentID: 'member_'+accountNumber+'_'+cardId, role: 'client' }, adminIdentity);
    const enrollment = await ca.enroll({ enrollmentID: 'member_'+accountNumber+'_'+cardId, enrollmentSecret: secret });
    const userIdentity = X509WalletMixin.createIdentity('Org1MSP', enrollment.certificate, enrollment.key.toBytes());
    await wallet.import('member_'+accountNumber+'_'+cardId, userIdentity);
    console.log('Successfully registered and enrolled admin user "'+'member_'+accountNumber+'_'+cardId+'" and imported it into the wallet');

    // Disconnect from the gateway admin.
    await gateway.disconnect();

    // Check to see if we've already enrolled the user.
    const userExists1 = await wallet.exists('member_'+accountNumber+'_'+cardId);
    if (!userExists1) {
        console.log('An identity for the user "'+'member_'+accountNumber+'_'+cardId+'" does not exist in the wallet');
        console.log('Run the registerUser.js application before retrying');
        return;
    }

    // Create a new gateway for connecting to our peer node.
    await gateway.connect(ccpPath, { wallet, identity: 'member_'+accountNumber+'_'+cardId, discovery: { enabled: true, asLocalhost: true } });

    // Get the network (channel) our contract is deployed to.
    const network = await gateway.getNetwork('mychannel');

    // Get the contract from the network.
    const contract = network.getContract('new');
    //const result = await contract.evaluateTransaction('queryAllCars');
    //console.log(`Transaction has been evaluated, result is: ${result.toString()}`);
    // Submit the specified transaction.
    // createCar transaction - requires 5 argument, ex: ('createCar', 'CAR12', 'Honda', 'Accord', 'Black', 'Tom')
    // changeCarOwner transaction - requires 2 args , ex: ('changeCarOwner', 'CAR10', 'Dave')
    await contract.submitTransaction('createNewMember', accountNumber, cardId, firstName, lastName, email,phoneNumber);
    console.log('Transaction has been submitted');

    // Disconnect from the gateway.
    await gateway.disconnect();
    return response;
    

  } catch (e) {
    response.error = ''+e;
    console.error(`Failed to evaluate transaction: ${e}`);
    return response; 
  }
}


async function regPartner(accountNumber,cardId,name) {
  var response = {};
  response.error = "";

  try {

    // Create a new file system based wallet for managing identities.
    const walletPath = path.join(process.cwd(), 'wallet');
    const wallet = new FileSystemWallet(walletPath);
    console.log(`Wallet path: ${walletPath}`);

    // Check to see if we've already enrolled the user.
    const userExists = await wallet.exists('partner_'+accountNumber+'_'+cardId);
    if (userExists) {
        console.log('An identity for the user "'+'partner_'+accountNumber+'_'+cardId+'" already exists in the wallet');
        return;
    }

    // Check to see if we've already enrolled the admin user.
    const adminExists = await wallet.exists('admin');
    if (!adminExists) {
        console.log('An identity for the admin user "admin" does not exist in the wallet');
        console.log('Run the enrollAdmin.js application before retrying');
        return;
    }

    // Create a new gateway for connecting to our peer node.
    const gateway = new Gateway();
    await gateway.connect(ccpPath, { wallet, identity: 'admin', discovery: { enabled: true, asLocalhost: true } });

    // Get the CA client object from the gateway for interacting with the CA.
    const ca = gateway.getClient().getCertificateAuthority();
    const adminIdentity = gateway.getCurrentIdentity();

    // Register the user, enroll the user, and import the new identity into the wallet.
    const secret = await ca.register({ affiliation: 'org1.department1', enrollmentID: 'partner_'+accountNumber+'_'+cardId, role: 'client' }, adminIdentity);
    const enrollment = await ca.enroll({ enrollmentID: 'partner_'+accountNumber+'_'+cardId, enrollmentSecret: secret });
    const userIdentity = X509WalletMixin.createIdentity('Org1MSP', enrollment.certificate, enrollment.key.toBytes());
    await wallet.import('partner_'+accountNumber+'_'+cardId, userIdentity);
    console.log('Successfully registered and enrolled admin user "'+'partner_'+accountNumber+'_'+cardId+'" and imported it into the wallet');

    // Disconnect from the gateway admin.
    await gateway.disconnect();

    // Check to see if we've already enrolled the user.
    const userExists1 = await wallet.exists('partner_'+accountNumber+'_'+cardId);
    if (!userExists1) {
        console.log('An identity for the user "'+'partner_'+accountNumber+'_'+cardId+'" does not exist in the wallet');
        console.log('Run the registerUser.js application before retrying');
        return;
    }

    // Create a new gateway for connecting to our peer node.
    await gateway.connect(ccpPath, { wallet, identity: 'partner_'+accountNumber+'_'+cardId, discovery: { enabled: true, asLocalhost: true } });

    // Get the network (channel) our contract is deployed to.
    const network = await gateway.getNetwork('mychannel');

    // Get the contract from the network.
    const contract = network.getContract('new');

    // Submit the specified transaction.
    // createCar transaction - requires 5 argument, ex: ('createCar', 'CAR12', 'Honda', 'Accord', 'Black', 'Tom')
    // changeCarOwner transaction - requires 2 args , ex: ('changeCarOwner', 'CAR10', 'Dave')
    await contract.submitTransaction('createNewPartner', accountNumber, cardId, name);
    console.log('Transaction has been submitted');

    // Disconnect from the gateway.
    await gateway.disconnect();
    return response;
    

  } catch (e) {
    response.error = ''+e;
    console.error(`Failed to evaluate transaction: ${e}`);
    return response; 
  }
}



async function getMember(accountNumber,cardId) {
  var returnResult = {};
  

  try {

    // Create a new file system based wallet for managing identities.
    const walletPath = path.join(process.cwd(), 'wallet');
    const wallet = new FileSystemWallet(walletPath);
    console.log(`Wallet path: ${walletPath}`);


    // Check to see if we've already enrolled the user.
    const userExists1 = await wallet.exists('member_'+accountNumber+'_'+cardId);
    if (!userExists1) {
        console.log('An identity for the user "'+'member_'+accountNumber+'_'+cardId+'" does not exist in the wallet');
        return;
    }

    // Create a new gateway for connecting to our peer node.
    const gateway = new Gateway();
    await gateway.connect(ccpPath, { wallet, identity: 'member_'+accountNumber+'_'+cardId, discovery: { enabled: true, asLocalhost: true } });


    // Get the network (channel) our contract is deployed to.
    const network = await gateway.getNetwork('mychannel');

    // Get the contract from the network.
    const contract = network.getContract('new');

    // Submit the specified transaction.
    // createCar transaction - requires 5 argument, ex: ('createCar', 'CAR12', 'Honda', 'Accord', 'Black', 'Tom')
    // changeCarOwner transaction - requires 2 args , ex: ('changeCarOwner', 'CAR10', 'Dave')
    const result = await contract.submitTransaction('queryMember', 'member_'+accountNumber+'_'+cardId);
    console.log(`Transaction has been evaluated, result is: ${result.toString()}`);

    // Disconnect from the gateway.
    await gateway.disconnect();
    //return response;
    returnResult.result = result.toString();
    return returnResult;

  } catch (e) {
    returnResult.error = ''+e;
    console.error(`Failed to evaluate transaction: ${e}`);
    return returnResult; 
  }
}


async function getPartner(accountNumber,cardId) {
  var returnResult = {};
  

  try {

    // Create a new file system based wallet for managing identities.
    const walletPath = path.join(process.cwd(), 'wallet');
    const wallet = new FileSystemWallet(walletPath);
    console.log(`Wallet path: ${walletPath}`);


    // Check to see if we've already enrolled the user.
    const userExists1 = await wallet.exists('partner_'+accountNumber+'_'+cardId);
    if (!userExists1) {
        console.log('An identity for the user "'+'partner_'+accountNumber+'_'+cardId+'" does not exist in the wallet');
        return;
    }

    // Create a new gateway for connecting to our peer node.
    const gateway = new Gateway();
    await gateway.connect(ccpPath, { wallet, identity: 'partner_'+accountNumber+'_'+cardId, discovery: { enabled: true, asLocalhost: true } });


    // Get the network (channel) our contract is deployed to.
    const network = await gateway.getNetwork('mychannel');

    // Get the contract from the network.
    const contract = network.getContract('new');

    // Submit the specified transaction.
    // createCar transaction - requires 5 argument, ex: ('createCar', 'CAR12', 'Honda', 'Accord', 'Black', 'Tom')
    // changeCarOwner transaction - requires 2 args , ex: ('changeCarOwner', 'CAR10', 'Dave')
    const result = await contract.submitTransaction('queryPartner', 'partner_'+accountNumber+'_'+cardId);
    console.log(`Transaction has been evaluated, result is: ${result.toString()}`);

    // Disconnect from the gateway.
    await gateway.disconnect();
    //return response;
    returnResult.result = result.toString();
    return returnResult;

  } catch (e) {
    returnResult.error = ''+e;
    console.error(`Failed to evaluate transaction: ${e}`);
    return returnResult; 
  }
}


async function getAllPartner(accountNumber,cardId) {
  var returnResult = {};
  

  try {

    // Create a new file system based wallet for managing identities.
    const walletPath = path.join(process.cwd(), 'wallet');
    const wallet = new FileSystemWallet(walletPath);
    console.log(`Wallet path: ${walletPath}`);


    // Check to see if we've already enrolled the user.
    const userExists1 = await wallet.exists('member_'+accountNumber+'_'+cardId);
    if (!userExists1) {
        console.log('An identity for the user "'+'member_'+accountNumber+'_'+cardId+'" does not exist in the wallet');
        return;
    }

    // Create a new gateway for connecting to our peer node.
    const gateway = new Gateway();
    await gateway.connect(ccpPath, { wallet, identity: 'member_'+accountNumber+'_'+cardId, discovery: { enabled: true, asLocalhost: true } });


    // Get the network (channel) our contract is deployed to.
    const network = await gateway.getNetwork('mychannel');

    // Get the contract from the network.
    const contract = network.getContract('new');

    // Submit the specified transaction.
    // createCar transaction - requires 5 argument, ex: ('createCar', 'CAR12', 'Honda', 'Accord', 'Black', 'Tom')
    // changeCarOwner transaction - requires 2 args , ex: ('changeCarOwner', 'CAR10', 'Dave')
    const result = await contract.submitTransaction('queryMemberByDocType','tom');
    console.log(`Transaction has been evaluated, result is aaaaaaaa : ${result.toString()}`);

    // Disconnect from the gateway.
    await gateway.disconnect();
    //return response;
    returnResult.result = result.toString();
    return returnResult;

  } catch (e) {
    returnResult.error = ''+e;
    console.error(`Failed to evaluate transaction: ${e}`);
    return returnResult; 
  }
}

async function getHist(accountNumber,cardId,typeDoc) {
  var returnResult = {};
  

  try {

    // Create a new file system based wallet for managing identities.
    const walletPath = path.join(process.cwd(), 'wallet');
    const wallet = new FileSystemWallet(walletPath);
    console.log(`Wallet path: ${walletPath}`);


    // Check to see if we've already enrolled the user.
    const userExists1 = await wallet.exists(typeDoc+'_'+accountNumber+'_'+cardId);
    if (!userExists1) {
        console.log('An identity for the user "'+typeDoc+'_'+accountNumber+'_'+cardId+'" does not exist in the wallet');
        return;
    }

    // Create a new gateway for connecting to our peer node.
    const gateway = new Gateway();
    await gateway.connect(ccpPath, { wallet, identity: typeDoc+'_'+accountNumber+'_'+cardId, discovery: { enabled: true, asLocalhost: true } });


    // Get the network (channel) our contract is deployed to.
    const network = await gateway.getNetwork('mychannel');

    // Get the contract from the network.
    const contract = network.getContract('new');

    // Submit the specified transaction.
    // createCar transaction - requires 5 argument, ex: ('createCar', 'CAR12', 'Honda', 'Accord', 'Black', 'Tom')
    // changeCarOwner transaction - requires 2 args , ex: ('changeCarOwner', 'CAR10', 'Dave')
    const result = await contract.submitTransaction('getHistory',typeDoc+'_'+accountNumber+'_'+cardId);
    console.log(`Transaction has been evaluated, result is bbb11111 : ${result.toString()}`);

    // Disconnect from the gateway.
    await gateway.disconnect();
    //return response;
    returnResult.result = result.toString();
    return returnResult;

  } catch (e) {
    returnResult.error = ''+e;
    console.error(`Failed to evaluate transaction: ${e}`);
    //return returnResult; 
  }
}



async function doUsePoint(accountNumber,cardId,point,partnerId) {
  var returnResult = {};
  returnResult.error = '';

  try {

    // Create a new file system based wallet for managing identities.
    const walletPath = path.join(process.cwd(), 'wallet');
    const wallet = new FileSystemWallet(walletPath);
    console.log(`Wallet path: ${walletPath}`);


    // Check to see if we've already enrolled the user.
    const userExists1 = await wallet.exists('member_'+accountNumber+'_'+cardId);
    if (!userExists1) {
        console.log('An identity for the user "'+'member_'+accountNumber+'_'+cardId+'" does not exist in the wallet');
        return;
    }

    // Create a new gateway for connecting to our peer node.
    const gateway = new Gateway();
    await gateway.connect(ccpPath, { wallet, identity: 'member_'+accountNumber+'_'+cardId, discovery: { enabled: true, asLocalhost: true } });


    // Get the network (channel) our contract is deployed to.
    const network = await gateway.getNetwork('mychannel');

    // Get the contract from the network.
    const contract = network.getContract('new');

    // Submit the specified transaction.
    // createCar transaction - requires 5 argument, ex: ('createCar', 'CAR12', 'Honda', 'Accord', 'Black', 'Tom')
    // changeCarOwner transaction - requires 2 args , ex: ('changeCarOwner', 'CAR10', 'Dave')
    //const result = 

    await contract.submitTransaction('usePoint',accountNumber,cardId,point+"",partnerId);
    //console.log(`Transaction has been evaluated, result is : ${result.toString()}`);

    // Disconnect from the gateway.
    await gateway.disconnect();
    //return response;
    //returnResult.result = result.toString();
    return returnResult;

  } catch (e) {
    returnResult.error = ''+e;
    console.error(`Failed to evaluate transaction: ${e}`);
    return returnResult; 
  }
}

async function doEarnPoint(accountNumber,cardId,point,partnerId) {
  var returnResult = {};
  returnResult.error = '';

  try {

    // Create a new file system based wallet for managing identities.
    const walletPath = path.join(process.cwd(), 'wallet');
    const wallet = new FileSystemWallet(walletPath);
    console.log(`Wallet path: ${walletPath}`);


    // Check to see if we've already enrolled the user.
    const userExists1 = await wallet.exists('member_'+accountNumber+'_'+cardId);
    if (!userExists1) {
        console.log('An identity for the user "'+'member_'+accountNumber+'_'+cardId+'" does not exist in the wallet');
        return;
    }

    // Create a new gateway for connecting to our peer node.
    const gateway = new Gateway();
    await gateway.connect(ccpPath, { wallet, identity: 'member_'+accountNumber+'_'+cardId, discovery: { enabled: true, asLocalhost: true } });


    // Get the network (channel) our contract is deployed to.
    const network = await gateway.getNetwork('mychannel');

    // Get the contract from the network.
    const contract = network.getContract('new');

    // Submit the specified transaction.
    // createCar transaction - requires 5 argument, ex: ('createCar', 'CAR12', 'Honda', 'Accord', 'Black', 'Tom')
    // changeCarOwner transaction - requires 2 args , ex: ('changeCarOwner', 'CAR10', 'Dave')
    //const result = 

    await contract.submitTransaction('earnPoint',accountNumber,cardId,point+"",partnerId);
    //console.log(`Transaction has been evaluated, result is : ${result.toString()}`);

    // Disconnect from the gateway.
    await gateway.disconnect();
    //return response;
    //returnResult.result = result.toString();
    return returnResult;

  } catch (e) {
    returnResult.error = ''+e;
    console.error(`Failed to evaluate transaction: ${e}`);
    return returnResult; 
  }
}


async function doCreateCourse(partnerId,cardId) {
  var returnResult = {};
  returnResult.error = '';

  try {

    // Create a new file system based wallet for managing identities.
    const walletPath = path.join(process.cwd(), 'wallet');
    const wallet = new FileSystemWallet(walletPath);
    console.log(`Wallet path: ${walletPath}`);


    // Check to see if we've already enrolled the user.
    const userExists1 = await wallet.exists('partner_'+partnerId+'_'+cardId);
    if (!userExists1) {
        console.log('An identity for the user "'+'partner_'+partnerId+'_'+cardId+'" does not exist in the wallet');
        return;
    }

    // Create a new gateway for connecting to our peer node.
    const gateway = new Gateway();
    await gateway.connect(ccpPath, { wallet, identity: 'member_'+partnerId+'_'+cardId, discovery: { enabled: true, asLocalhost: true } });


    // Get the network (channel) our contract is deployed to.
    const network = await gateway.getNetwork('mychannel');

    // Get the contract from the network.
    const contract = network.getContract('new');

    // Submit the specified transaction.
    // createCar transaction - requires 5 argument, ex: ('createCar', 'CAR12', 'Honda', 'Accord', 'Black', 'Tom')
    // changeCarOwner transaction - requires 2 args , ex: ('changeCarOwner', 'CAR10', 'Dave')
    //const result = 

    let course = {};
    course.docType = 'course';
    course.title = "test";
    course.point = "80";
    course.content = "content ABC";
    course.madeby = partnerId;

    await contract.submitTransaction('createCourse',accountNumber,cardId,course);
    //console.log(`Transaction has been evaluated, result is : ${result.toString()}`);

    // Disconnect from the gateway.
    await gateway.disconnect();
    //return response;
    //returnResult.result = result.toString();
    return returnResult;

  } catch (e) {
    returnResult.error = ''+e;
    console.error(`Failed to evaluate transaction: ${e}`);
    return returnResult; 
  }
}