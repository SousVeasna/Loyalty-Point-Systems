var apiUrl = location.protocol + '//' + location.host + "/api/";

//check user input and call server
$('.sign-in-partner').click(function() {

  //get user input data
  var formPartnerId = $('.partner-id input').val();
  var formCardId = $('.card-id input').val();

  //create json data
  var inputData = '{' + '"partnerid" : "' + formPartnerId + '", ' + '"cardid" : "' + formCardId + '"}';
  console.log(inputData);

  //make ajax call
  $.ajax({
    type: 'POST',
    url: apiUrl + 'partnerData',
    data: inputData,
    dataType: 'json',
    contentType: 'application/json',
    beforeSend: function() {
      //display loading
      document.getElementById('loader').style.display = "block";
    },
    success: function(data) {

      //remove loader
      document.getElementById('loader').style.display = "none";

      //check data for error
      if (data.error) {
        alert(data.error);
        return;
      } else {
        console.log("data partner 1",data);
        console.log("data partner 2",data.name);
        console.log("data partner 3",data.usePointsResults);
        console.log("data partner 4",data.earnPointsResult);
        console.log("data partner 5",data.listCourse);
        //update heading
        $('.heading').html(function() {
          var str = '<h2><b> ' + data.name + ' </b></h2>';
          str = str + '<h2><b> ' + data.id + ' </b></h2>';

          return str;
        });

        //update dashboard
        $('.dashboards').html(function() {
          var str = '';
          str = str + '<h5>Total points allocated to customers: ' + data.pointsGiven + ' </h5>';
          str = str + '<h5>Total points redeemed by customers: ' + data.pointsCollected + ' </h5>';
          return str;
        });

        //update earn points transaction
        $('.points-allocated-transactions').html(function() {
          var str = '';
          var transactionData = data.earnPointsResult;

          for (var i = 0; i < transactionData.length; i++) {
            str = str + '<p>timeStamp: ' + transactionData[i].timestamp + '<br />partner: ' + transactionData[i].partner + '<br />member: ' + transactionData[i].member + '<br />points: ' + transactionData[i].points + '<br />transactionName: ' + transactionData[i].transactionName + '<br />transactionID: ' + transactionData[i].transactionId + '</p><br>';
          }
          return str;
        });

        //update use points transaction
        $('.points-redeemed-transactions').html(function() {
          var str = '';
          var transactionData = data.usePointsResults;

          for (var i = 0; i < transactionData.length; i++) {
            str = str + '<p>timeStamp: ' + transactionData[i].timestamp + '<br />partner: ' + transactionData[i].partner + '<br />member: ' + transactionData[i].member + '<br />points: ' + transactionData[i].points + '<br />transactionName: ' + transactionData[i].transactionName + '<br />transactionID: ' + transactionData[i].transactionId + '</p><br>';
          }
          return str;
        });

        
        //update use points transaction
        $('.list-course').html(function() {
          var str = '';
          var course = data.listCourse;

          for (var i = 0; i < course.length; i++) {
            str = str + '<p>Title: ' + course[i].title + '<br />Content: ' + course[i].content + '<br />Point: ' + course[i].point + '</p><br>';
          }
          return str;
        });

        //remove login section
        document.getElementById('loginSection').style.display = "none";
        //display transaction section
        document.getElementById('transactionSection').style.display = "block";
      }

    },
    error: function(jqXHR, textStatus, errorThrown) {
      //reload on error
      alert("Error: Try again")
      console.log(errorThrown);
      console.log(textStatus);
      console.log(jqXHR);

      location.reload();
    }
  });

});

//creat course
$('#addCourse').click(function() {

  createCourse();
});


function createCourse() {

   //get user input data
   var title = $("#txtTitle").val();
   var content = $("#txtContent").val();
   var point = $("#txtPoint").val();
   var formPartnerId = $('.partner-id input').val();
   var formCardId = $('.card-id input').val();
 
   //create json data
   var inputData = '{' + '"partnerid" : "' + formPartnerId + '", ' + '"cardid" : "' + formCardId + '", ' + '"title" : "' + title + '", ' + '"content" : "' + content + '", ' + '"point" : "' + point + '"}';
   console.log(inputData);

  //make ajax call
  $.ajax({
    type: 'POST',
    url: apiUrl + 'createCourse',
    data: inputData,
    dataType: 'json',
    contentType: 'application/json',
    beforeSend: function() {
      //display loading
      document.getElementById('loader').style.display = "block";
      
    },
    success: function(data) {

      document.getElementById('loader').style.display = "none";
      

      // //check data for error
      // if (data.error) {
      //   alert(data.error);
      //   return;
      // } else {
      //   //update member page and notify successful transaction
      //   updateMember();
      //   alert('Transaction successful');
      // }


    },
    error: function(jqXHR, textStatus, errorThrown) {
      alert("Error: Try again")
      console.log(errorThrown);
      console.log(textStatus);
      console.log(jqXHR);
    }
  });

}