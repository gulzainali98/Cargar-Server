//"last integer represents changes in logs. Last integer would increase when new logs are printed or old logs are deleted or altered."+
//	" This represnts console.log operations" +
//	" and middle integer represents Addition or updation or deletion of a"+
//	" function's task or function or a listener or a listener's task. First integer represents if a major change in architecture"+
//	" have occured from server side . as in addition of a field in taxi customer matched."
// version 1.1.2
console.log("version 6.9.5");
console.log("last integer represents changes in logs. Last integer would increase when new logs are printed or old logs are deleted or altered."+
	" This represnts console.log operations" +
	" and middle integer represents Addition or updation or deletion of a"+
	" function's task or function or a listener or a listener's task. First integer represents if a major change in architecture"+
	" have occured from server side . as in addition of a field in taxi customer matched.")
var firebase = require("firebase");
var http = require('http');
var https=require('https');
var unirest = require('unirest');
var delayed = require('delayed');
var Promise = require("promise");
firebase.initializeApp({
  serviceAccount: "Thetacab-663b05bdc002.json",
  databaseURL: "https://project-2162072630908720035.firebaseio.com/"
});

// Options for calculating distance
function distanceOptions(fromLat,fromLong,toLat,toLong){
var options = {
  host: 'maps.googleapis.com',
  path: '/maps/api/directions/json?origin='+fromLat+','+fromLong+'&destination='+toLat+','+toLong+'&key=AIzaSyDAzVI-dBFk17Wag1Yih8l6x6lpem2GtVA',
  method: 'GET',
    headers: {
        'Content-Type': 'application/json'
    } 
};
return options;
}
//Calculating distances through google maps get request function
function calculateDistance(options,resolve,driverKey,customerKey){
var distanceDurationObject={};
var req = https.get(options, function(res) {
 //buffering alll data
  var bodyChunks = [];
  res.on('data', function(chunk) {
    // You can process streamed parts here...
    bodyChunks.push(chunk);
  }).on('end', function() {
    var body = Buffer.concat(bodyChunks);
     json = JSON.parse(body);
     console.log("Json Google",json);
//writing to file
    var routes =json["routes"];
    if(routes!=undefined){
	    var legsObject=routes[0].legs;
		
	    var legsFirstArray=legsObject[0];
	    //Our Required Distance from two points from toronto to montreal as given above 
	    var distanceValue=legsFirstArray.distance.value;
	    var durationValue=legsFirstArray.duration.value;
	    console.log(distanceValue+"  "+durationValue);
	    distanceDurationObject.distance=distanceValue;
	    distanceDurationObject.duration=durationValue;
	    distanceDurationObject.driverKey=driverKey;
	    distanceDurationObject.customerKey=customerKey;
	    resolve(distanceDurationObject);
    }


  });
});

req.on('error', function(e) {
  console.log('ERROR: ' + e.message);
  //try to add this error to a file
});
}


//ending calculting distance between two points
var db = firebase.database();
var ref = db.ref("Order");
//Map of UserOrder
var UserOrder=[];
//Map of time out functions and customer Keys
var TimeOutMappingCustomer=[];
//Object of Order;
var order={};
//Map of Drivers Location
var DriverLocation=[];
//Map of Drivers Object
var DriverObject={};
//Object for testing
var testObject={};
//Drivers awaiting confirmation of orders
var UsedDrivers=[];
//Drivers who rejected orders to customers
var DriversCustomersReject=[];
//Customers who are rejected by Drivers
var CustomersDriversReject=[];
//Map of orders which are rejected by server
var serverRejections=[];
//Snapshot of previous driver locations
var prevSnapshot;
//Map of driver Locations with their objectso
var driverLocationMap=[];
/////////////////////////////
var ref5= db.ref("CustomerTaxiMatched");
var ref6= db.ref("TaxiCustomerMatched");
//Starting listener for once to establish a baseline of snapshot;
db.ref("DriverLocation").once("value",function(snapshot){
  prevSnapshot=snapshot;
  setTimeout(cleanDriverLocations,4000,prevSnapshot);
});
///Customer Driver Mapping///
db.ref("AcceptedOrders").on("child_added",function(snapshot){
	if(snapshot.val()!=null){
		console.log("clearing time out");
		clearTimeout(TimeOutMappingCustomer[snapshot.key]);
	}
});
///////Rejected Orders///////
db.ref("RejectedOrders").on("child_added",function(snapshot){
	console.log("object ", snapshot.key);
	console.log("working rejected orders");
	customerKey=snapshot.key;
	if(snapshot.key!="123"){
	var childata=(snapshot.val());
	var customerId=snapshot.key;
	console.log("CUstomer Id =>"+ customerId);
	
	var object;
	if(customerId!="RejectedOrders"){
		console.log("Under Customer Id Rejected Orders");
	db.ref("CustomerTaxiMatched").child(customerId).once("value",function(snapshot){
		console.log("Customer Taxi Matched LIstener ");
		if(snapshot.val()!=null){
		var driverId=snapshot.val();
		var customerId=snapshot.key;
		console.log("Rejected Orders=>"+driverId);
		DriversCustomersReject[driverId]=customerId;
		CustomersDriversReject[customerId]=driverId;
		console.log("we do not add this driver =>"+DriversCustomersReject[driverId]+" and "+" this customer =>"+CustomersDriversReject[customerId]);
	    delete UsedDrivers[driverId];
	    db.ref("RejectedOrders").child(customerId).set(null);
	    

		console.log("Customer Id => "+snapshot.val()+"  ::  " + customerId);
		db.ref("TaxiCustomerMatched").child(driverId).set(null);
		db.ref("CustomerTaxiMatched").child(customerId).set(null);
		if(serverRejections[customerId]!=undefined){
			changeDriverStatus(driverId);
			delete serverRejections[customerId];
		}

		console.log("deleted");

		db.ref("Order").child(customerId).once("value", function(snapshot){
			object=snapshot.val();
			
			db.ref("Order").child(customerId).set(null);
			db.ref("Order").child(customerId).set(object);
			if(serverRejections[customerId]==1){
				delete serverRejections[customerId];
				console.log("changing status of driver with id : "+driverId);
			//	changeDriverStatus(driverId);
			}
		});
		
	}
	else{
		//so that garbage rejected orders are deleted from the database
		db.ref("RejectedOrders").child(customerKey).set(null);
	}
});
};
}

});
////////////////////////////

var ref2=db.ref("DriverLocation");
ref2.on("child_added",function(childSnapshot){
	console.log("JSON : "+ childSnapshot);
	var key=childSnapshot.key;
	var childData=childSnapshot.val();
	var DriverObject={};
	DriverObject.Lat=childData.Lat;
	DriverObject.Long=childData.Long;
	DriverLocation[key]=DriverObject;	
	console.log("DriverLocation : " + childData.Lat+" : "+childData.Long);

});
ref2.on("child_removed",function(snapshot){
	var driverKey= snapshot.key;

	console.log("removing child",snapshot.key);
	//delete DriverLocation[driverKey];
});
ref2.on("child_changed",function(snapshot){
	var driverData= snapshot.val();
	var driverObject={};
	driverObject.Lat=driverData.Lat;
	driverObject.Long=driverData.Long;
	DriverLocation[snapshot.key]=driverObject;
}); 
ref.on("child_added", function(childSnapshot) {
   
    // key will be "fred" the first time and "barney" the second time
    var key = childSnapshot.key;
    var customerkey=childSnapshot.key; 
    console.log("key=>"+customerkey);
    // childData will be the actual contents of the child
    var childData = childSnapshot.val();
    if(childData!=null){
    var order={};		
    order.DestLat=parseFloat(childData.destLat);
    order.DestLong=parseFloat(childData.destLong);
    order.SourceLat=parseFloat(childData.sourceLat);
    order.SourceLong=parseFloat(childData.sourceLong);
    //console.log("Destination Latitude : "+childData.DestLat);
   // console.log("Destination Longitude : "+ childData.DestLong);
   // console.log("Source Latitude : "+ childData.SourceLat);
   // console.log("Source Longitude : "+ childData.SourceLong);
    UserOrder[key]=order;
    
    if(CustomersDriversReject[customerkey]!=Object.keys(DriverLocation)[0]){
    var minkey=Object.keys(DriverLocation)[0];
	}
	else{
	var minkey=undefined;	
	}
    var minDriverObject=DriverLocation[minkey];
    var distanceArray=[];
    //finding minimum distance
    if(Object.keys(DriverLocation).length>0){
    Object.keys(DriverLocation).forEach(function(dkey){
    		DriverObject=DriverLocation[dkey];
		
		//Our Algorithm
		if(DriversCustomersReject[dkey]!=customerkey){		
		if(UsedDrivers[dkey]==undefined ){
			distanceArray.push(new Promise(function(resolve, reject) {
     			var options= distanceOptions(order.SourceLat,order.SourceLong,DriverObject.Lat,DriverObject.Long);
  			   //executing http request
   			calculateDistance(options,resolve,dkey,customerkey); 
				})
		);
		}
	}
	});
	if(distanceArray.length==0){
		db.ref("NotifyDriverAbsence").child(customerkey).set(false);
	}
	Promise.all(distanceArray).then(function(values){  
        console.log("in promising");
    	 //map of driver's index in array to it's key
		var driverIndexToKey=[];
		var minimumKey=undefined;
		var minIndex=0;
		        
		if(values.length>0){
		 	
			minimumKey=values[0].driverKey; 
			console.log("aha=>",minimumKey); 
			values.forEach(function(element,index,array){
				driverIndexToKey[index]=element.key;
				console.log("minimum key hulala : "+ minimumKey);
				console.log("array["+minimumKey+"].distance="+element.distance);
				if(array[minIndex].distance > element.distance)
				{
					minIndex=index;
					minimumKey=element.driverKey;		
					console.log("driver key : "+element.driverKey);	
				}	
				console.log("yaha tou mein ata hu");
			});
			console.log("just before if : "+minimumKey);
			
				if(minimumKey!=undefined && minimumKey==values[0].customerKey){
					UsedDrivers[minimumKey]=1;
					db.ref("Order").child(values[0].customerKey).set(null);
					db.ref("Order").child(values[0].customerKey).set(snapshot.val());
				}
				else if(minimumKey!=undefined){
					console.log("i am in min , orderId=>"+values[0].customerKey+"   driverId=>"+minimumKey);
					//notifyTaxiCustomer(values[0].customerKey,minimumKey,customerKey);
				
					firebase.database().ref("Order").child(values[0].customerKey).once("value",function(snapshot){
					if(snapshot.val()!=null){
					  if(UsedDrivers[values[0].driverKey]==undefined){
					  ref5.child(values[0].customerKey).set(minimumKey);
				    	//send customer key to driver by setting customer key under taxicustomermartched/mindriverkey
				   	 ref6.child(minimumKey).set(values[0].customerKey);
				   	 UsedDrivers[minimumKey]=1;
				   	 var customerDriverObject={};
				   	 customerDriverObject.customerKey=values[0].customerKey;
				   	 customerDriverObject.driverKey=values[0].driverKey; 
				   	 TimeOutMappingCustomer[customerDriverObject.customerKey]=setTimeout(rejectOrderAfterGivenTime,20000,customerDriverObject);
				   	 sendFCMNotification(minimumKey);
				   	 //delete UsedDrivers key when update enters in orders accepted or rejected
				   	}
				   	else{
				   		db.ref("Order").child(values[0].customerKey).set(null);
				   		db.ref("Order").child(values[0].customerKey).set(snapshot.val());
				   	}
					}
					});
			}
		}else{

		}
		
	});
	}else{
		db.ref("NotifyDriverAbsence").child(customerkey).set(false);
	}

    //send driver key to customer by setting driver key under customertaximatched/customerkey
    //if(minkey!=undefined){
	
    //notifyTaxiCustomer(customerkey,minkey,key),4000);
  	
   // }
    console.log("Data : " + UserOrder[key].DestLat+" "+UserOrder[key].DestLong);
         
	}  



//Just like that it will listen to taxi drivers locations in real time and when an order is made
//it will listen to the new order . calculate the nearest taxi driver to the source or whatever algorithm is used
//and add an entry in a matching field named CustomerRespond table of Driver ID and DriverRespond Table of CustomeID  
//Both will be listening to to there particular tables entries structure would be like this
// CustomerRespond->CustomerID->DriverID:1 and customer will be listening to the CustomerID part of schema
//so will be the case with driver
//Driver once gets an update will go to orders table and get the order against customerID since all the orders are identified by CustomerIDs
//Driver will show the order on the app who can then reject or accept it
// on reject drivers device will rejection signal in another table which server will be listening whose schema would be like
//rejectionOrder->CustomerID(Since Orders are represented by customer ids)->DriverID
//server will then calculate the nearer taxi driver again
//and will do the same process
//on acceptance another Entry will be made in CustomerOrderAcceptance named table whose schema would be like
//CustomerOrderAcceptance->customerid->accept:1 customer cell phone would be listening at customerid part.
});

testObject.birthday=23;
testObject.age=55.5;
testObject.sex="male";
var ref3=db.ref();
var usersRef = ref3.child("OrdersMatched")
usersRef.set({
  alanisawesome: {
    date_of_birth: "June 23, 1912",
    full_name: "Alan Turing"
  },
  gracehop: {
    date_of_birth: "December 9, 1906",
    full_name: "Grace Hopper"
  }
});
usersRef.child("ExtraData").set(testObject);

db.ref("CanceledTripsServer").on("child_added",function(snapshot){
if(snapshot.val()!='null'){
var Driverid=snapshot.val();
var Customerid=snapshot.key;
console.log("clearing time out in cancelTrip",Customerid);
clearTimeout(TimeOutMappingCustomer[Customerid]);
console.log("Cancel Trip snapshot is null");
db.ref("TaxiCustomerMatched").child(Driverid).set(null);
db.ref("CustomerTaxiMatched").child(Customerid).set(null);
db.ref("Order").child(Customerid).set(null);
db.ref("State").child(Customerid).set(1);
db.ref("CanceledTripsServer").child(Customerid).set(null);
UsedDrivers[Driverid]=undefined;
delete CustomersDriversReject[Customerid];
delete DriversCustomersReject[Driverid];
}
else{
	console.log("Cancel Trip snapshot not null");
var orderId=snapshot.key;
console.log("clearing time out in cancelTrip",Customerid);
clearTimeout(TimeOutMappingCustomer[orderId]);
db.ref("Order").child(orderId).set(null);
db.ref("CanceledTripsServer").child(orderId).set(null);
//db.ref("CanceledTripsDriver").child(orderId).set(null);
console.log("Order Id : "+ orderId);
console.log("Customer Driver Rejected Order Id"+CustomersDriversReject[orderId]);
//new   code

if(CustomersDriversReject[orderId]!=undefined){
	console.log("deleting driver"+DriversCustomersReject[CustomersDriversReject[orderId]]);
	delete DriversCustomersReject[CustomersDriversReject[orderId]]
	delete CustomersDriversReject[orderId];
	UsedDrivers[Driverid]=undefined;
}
//new code ends here
db.ref("CustomerTaxiMatched").child(orderId).once("value",function(snapshot){
	if(snapshot.val()!=null){
	var driverId = snapshot.val();
	var customerId= snapshot.key;
	db.ref("TaxiCustomerMatched").child(driverId).set(null);
	db.ref("CustomerTaxiMatched").child(customerId).set(null);
	console.log("Used Driver:"+driverId)
	delete CustomersDriversReject[customerId];
	delete DriversCustomersReject[driverId];
	UsedDrivers[driverId]=undefined;
	changeDriverStatus(driverId);
}
});
}
});


db.ref("EndTripServer").on("child_added",function(childSnapshot){
	
	//snapshot.forEach(function(childSnapshot){

		var asyncProcessArray=[];
		var customerKey=childSnapshot.key
		console.log(childSnapshot.val());
				//finding driver id
		//db.ref("CompletedOrders").child(customerKey).set(childSnapshot);
		var pushRef = db.ref("CompletedOrders").push();
		var pushKey = pushRef.key;
		console.log("hogaya");
		pushRef.child("Order").set(childSnapshot.val());
		pushRef.child("Id").set(pushKey);
		pushRef.child("CustomerId").set(customerKey);
		/*asyncProcessArray.push(new Promise(function(resolve,reject){
			completingCompletedTrips(db.ref("TripTime").child(customerKey),resolve,pushKey,"TripTime",customerKey);
		}));
		asyncProcessArray.push(new Promise(function(resolve,reject){
			completingCompletedTrips(db.ref("StartTripTime").child(customerKey),resolve,pushKey,"StartTripTime",customerKey);
		}));
		asyncProcessArray.push(new Promise(function(resolve,reject){
			completingCompletedTrips(db.ref("TripPath").child(customerKey),resolve,pushKey,"TripPath",customerKey);
		}));
		asyncProcessArray.push(new Promise(function(resolve,reject){
			gettingDriverId(pushKey,customerKey);
		}));
		Promise.all(asyncProcessArray);*/
		//I should be using promises with firebase before app goes online
		completingCompletedTrips(db.ref("TripTime").child(customerKey),pushKey,"TripTime",customerKey);
		completingCompletedTrips(db.ref("StartTripTime").child(customerKey),pushKey,"StartTripTime",customerKey);
		completingCompletedTrips(db.ref("TripPath").child(customerKey),pushKey,"TripPath",customerKey);
		gettingDriverId(pushKey,customerKey);

				db.ref("EndTripServer").child(customerKey).set(null);

				db.ref("CustomerTaxiMatched").child(customerKey).once("value",function(snapshot){
					var customerId=snapshot.key;
					var driverId=snapshot.val();
					db.ref("CustomerTaxiMatched").child(customerId).set(null);
					//Delete taxi drivers entry from used Drivers.
					UsedDrivers[driverId]=undefined;
					console.log("Trip Ended");
					delete DriversCustomersReject[driverId];
					delete CustomersDriversReject[customerId];
					delete CustomersDriversReject[DriversCustomersReject[driverId]];
					delete DriversCustomersReject[CustomersDriversReject[customerId]];
					//db.ref("TaxiCustomerMatched").child(driverId).set(null);

				});





		
		

	});
//});

function completingCompletedTrips(ref,key,name,customerid){
	ref.once("value",function(snapshot){
		db.ref("CompletedOrders").child(key).child(name).set(snapshot.val());
		//resolve(customerid);
		if(name=="TripTime" || name=="TripPath" || name=="StartTripTime"){
			db.ref(name).child(customerid).set(null);
		}

	});
}
function gettingDriverId(key,customerId){
	console.log("Key : "+key + ":: customer key : "+customerId );
	db.ref("CustomerTaxiMatched").child(customerId).once("value",function(snapshot){
		db.ref("CompletedOrders").child(key).child("DriverId").set(snapshot.val());
	});
}
function rejectOrderAfterGivenTime(customerDriverObject){
		//Check whether order have been accepted or not
		console.log("rejecting order automatically");
		db.ref("RejectedOrdersServer").child(customerDriverObject.customerKey).once("value",function(parentSnapshot){
		if(parentSnapshot.val()==null){
			db.ref("AcceptedOrders").child(customerDriverObject.customerKey).once("value",function(snapshot){
				if(snapshot.val()==null){
					console.log("rejecting");
						db.ref("Order").child(snapshot.key).once("value",function(childSnapshot){
						if(childSnapshot.val()!=null){
							serverRejections[childSnapshot.key]=1;
							console.log("Server is rejecting customer :"+childSnapshot.key);
							db.ref("RejectedOrders").child(childSnapshot.key).set(childSnapshot.val());
							//changeDriverStatus(customerDriverObject.driverKey)
							
						}
					});
					
				}
			});
		}
		else{
			if(customerDriverObject.customerKey!=null){
				console.log("I am here rejected Orders");
				db.ref("RejectedOrdersServer").child(customerDriverObject.customerKey).set(null);

		}
		}
		//if order have been accepted then donot do anything else remove the order 
		});
}
function sendFCMNotification(customerId){
	// db.ref("AppStatus").child(customerId).once("value",function(snapshot){
	 //	if(snapshot.val()!=null){
	 	//	if(snapshot.val()==0){
	 			db.ref("MapUIDtoInstanceID").child(customerId).once("value",function(childSnapshot){
	 				console.log("I am here");
	 				if(childSnapshot.val()!=null){
	 					sendMessageFCM(childSnapshot.val());
	 				}
	 				else{
	 					console.log("I can't help you ");
	 				}
	 			});
	 	//	}
	 	//}
	 //});
}
function sendMessageFCM(instanceId){
	console.log('Merey Payo Ka Message');
	var sendObject={};
	var notificationData={};
	notificationData.body="showcall";
	notificationData.title="You have a call"
	sendObject.to=instanceId;
	sendObject.data=notificationData;
	var json= JSON.stringify(sendObject);
	unirest.post('https://fcm.googleapis.com/fcm/send')
	.headers({'Content-Type': 'application/json','Authorization':'key=AIzaSyCKUi43uQYdDrA6A3SUAxlwVBpZsrCMMmU'})
	.send(json)
	.end(function (response) {
	  console.log(response.body);
});

}
function changeDriverStatus(driverId){
	db.ref("DriverState").child(driverId).set(null);
	db.ref("DriverState").child(driverId).set(0);
}
function cleanDriverLocations(firebaseSnapshot){
  db.ref("DriverLocation").once("value",function(snapshot){
    console.log("RUn");
    snapshot.forEach(function(childSnapshot){
    
      if(firebaseSnapshot.child(childSnapshot.key).val()!=null){
      	if((firebaseSnapshot.child(childSnapshot.key)).val().time==childSnapshot.val().time){
       // if((firebaseSnapshot.child(childSnapshot.key)).val().Lat==childSnapshot.val().Lat && 
         // (firebaseSnapshot.child(childSnapshot.key)).val().Long==childSnapshot.val().Long){
          delete DriverLocation[childSnapshot.key];
          console.log("-------------Deleting Idle Driver----------------");
          console.log("Driver Id :"+childSnapshot.key);
          console.log("Prev Latitude : "+(firebaseSnapshot.child(childSnapshot.key)).val().Lat);
          console.log("Prev Latitude : "+(firebaseSnapshot.child(childSnapshot.key)).val().Long);
          console.log("New Latitude : "+childSnapshot.val().Lat);
          console.log("New Latitude : "+childSnapshot.val().Long);
          console.log("-------------------------------------------------");
          db.ref("DriverLocation").child(childSnapshot.key).set(null);

        }
      }
    });
    prevSnapshot=snapshot;
    setTimeout(cleanDriverLocations,20000,prevSnapshot);
  });
}
db.ref("ServerNotification").on("child_added",function(snapshot){
	if(snapshot.val()==false){
		console.log("Driver Deleted : "+snapshot.key);
		delete DriverLocation[snapshot.key];
		if(Object.keys(DriverLocation)==0){
			console.log("NO Driver Available");
		}
		Object.keys(DriverLocation).forEach(function(key){
			console.log("Driver Array : "+DriverLocation[key]);
		});
	}
});
db.ref("ServerNotification").on("child_changed",function(snapshot){
	if(snapshot.val()==false){
		console.log("Driver Deleted : "+snapshot.key);
		delete DriverLocation[snapshot.key];
		if(Object.keys(DriverLocation)==0){
			console.log("NO Driver Available");
		}
		Object.keys(DriverLocation).forEach(function(key){
			console.log("Driver Array : "+DriverLocation[key]);
		});
	}
});
