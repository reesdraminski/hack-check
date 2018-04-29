/* global angular, firebase, QRCode, URL, Fingerprint2 */

// Create Angular App Module
var app = angular.module("hack-check", ["firebase"]);

function hashCode(str) {
    var hash = 0;
    if (str.length == 0) 
        return hash;
    
    for (var i = 0; i < str.length; i++) {
        var char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    
    return hash;
}

function clearURLParams() {
    // Get rid of ugly URL parameters
    var uri = window.location.toString();
    if (uri.indexOf("?") > 0) {
        var clean_uri = uri.substring(0, uri.indexOf("?"));
        window.history.replaceState({}, document.title, clean_uri);
    }
}

app.controller("RegistrationCtrl", function($scope, $window, $firebaseArray) {
    $scope.registration = true;
    
    $scope.register = function() {
        // Normalize dietary restrictions
        var dietary_restrictions = $scope.dietary_restrictions;
        if (dietary_restrictions == "Other")
            dietary_restrictions = $scope.dietary_other_text;
        else if (dietary_restrictions == "Food Allergies")
            dietary_restrictions = "Allergic to " + $scope.food_allergies;
        
        if ($scope.is_minor) {
            $scope.id = hashCode($scope.first_name + $scope.last_name + $scope.phone_number);
            
            var ref = firebase.database().ref().child("registrants/" + $scope.id);
            $scope.registrants = $firebaseArray(ref);
            
            // Add user to database
            $scope.registrants.$add({
                "id": $scope.id,
                "first_name": $scope.first_name,
                "last_name": $scope.last_name,
                "email": $scope.email,
                "phone_number": $scope.phone_number,
                "is_minor": true,
                "emergency_contact_name": $scope.emergency_contact_name,
                "emergency_contact_relationship": $scope.emergency_contact_relationship,
                "emergency_contact_phone": $scope.emergency_contact_phone,
                "school": $scope.school,
                "shirt_size": $scope.shirt_size,
                "dietary_restrictions": dietary_restrictions,
                "code_of_conduct": $scope.code_of_conduct == "I accept",
                "privacy_policy": $scope.privacy_policy == "I accept",
                "ate_lunch1": false,
                "ate_dinner": false,
                "ate_breakfast": false,
                "ate_lunch2": false,
                "show_email": false,
                "show_school": false,
                "checked_in": false
            })
            // When the user is succesfully added
            .then(function(ref) {
                $scope.postSubmit();
            })
            // Function for if the databse addition fails
            .catch(function(err) {
                console.log(err);
            });
        }
        // If the registrant is not a minor
        else {
            $scope.id = hashCode($scope.first_name + $scope.last_name + $scope.phone_number);
            
            var ref = firebase.database().ref().child("registrants/" + $scope.id);
            $scope.registrants = $firebaseArray(ref);
            
            // Add user to database
            $scope.registrants.$add({
                "id": $scope.id,
                "first_name": $scope.first_name,
                "last_name": $scope.last_name,
                "email": $scope.email,
                "phone_number": $scope.phone_number,
                "is_minor": false,
                "school": $scope.school,
                "shirt_size": $scope.shirt_size,
                "dietary_restrictions": dietary_restrictions,
                "code_of_conduct": $scope.code_of_conduct == "I accept",
                "privacy_policy": $scope.privacy_policy == "I accept",
                "ate_lunch1": false,
                "ate_dinner": false,
                "ate_breakfast": false,
                "ate_lunch2": false,
                "show_email": false,
                "show_school": false,
                "checked_in": false
            })
            // When the user is succesfully added
            .then(function(ref) {
                $scope.postSubmit();
            })
            // Function for if the databse addition fails
            .catch(function(err) {
                console.log(err);
            });
        }
        
        $scope.loading = true;
    };
    
    $scope.postSubmit = function() {
            $scope.registration = false;
            $scope.loading = false;
            
            // Generate URL
            var rootURL = "https://reesdraminski.github.io/hack-check/user.html";
            var url = rootURL + "?id=" + $scope.id;
            
            // Generate QR Code
            new QRCode(document.getElementById("qrcode"), url);
        };
});

app.controller("RegistrantViewCtrl", function($scope, $window, $firebaseArray) {
    // Get ID from URL
    var url_string = window.location.href;
    var url = new URL(url_string);
    $scope.id = url.searchParams.get("id");
    
    clearURLParams();
    
    $scope.enrolled = false;
    $scope.authenticated = false;
    $scope.showActionIndex = true;
    $scope.showMealIndex = false;
    $scope.showWorkshopIndex = false;
    
    var ref = firebase.database().ref().child("registrants/" + $scope.id);
    $scope.registrant = $firebaseArray(ref);
    
    $scope.workshops = $firebaseArray(firebase.database().ref().child("workshops"));
    
    $scope.enrolled_devices = $firebaseArray(firebase.database().ref().child("enrolled_devices"));
    
    $scope.enrolled = false;
    $scope.enrolled_devices.$loaded(function() {
        new Fingerprint2().get(function(result, components) {
            var deviceFingerprint = result;
                    
            for (var i = 0; i < $scope.enrolled_devices.length; i++) {
                var enrolledDeviceFingerprint = $scope.enrolled_devices[i].fingerprint;
                
                if (deviceFingerprint == enrolledDeviceFingerprint) {
                    $scope.$apply(function() {
                         $scope.enrolled = true;
                    });
                    
                    break;
                }
            }
        });
    });
    
    $scope.registrant.$loaded(function() {
        if ($scope.registrant.length !== 0) {
            $scope.userFound = true;
            
            $scope.data = $scope.registrant[0];
            
            $scope.full_name = $scope.data.first_name + " " + $scope.data.last_name;
            
            // Data privacy controls value initialization
            $scope.checkboxModel = {
                show_email: $scope.data.show_email,
                show_school: $scope.data.show_school,
                show_workshops: $scope.data.show_workshops
            };
            
            // Email is only set straight from database when enabled for security reasons
            if ($scope.data.show_email) 
                $scope.email = $scope.data.email;
            else
                $scope.email = "";
              
            // School is only set straight from the databse when enabled for security reasons  
            if ($scope.data.show_school)
                $scope.school = $scope.data.school;
            else
                $scope.school = "";
                
            if ($scope.data.show_workshops)
                $scope.workshops_attended = $scope.data.workshops_attended;
            else
                $scope.workshops_attended = [];
        }
        else
            $scope.userFound = false;
    });
    
    $scope.checkInRegistrant = function() {
        var data = $scope.data;
        data.checked_in = true;
        
        $scope.registrant.$save(data)
        .then(function() {
            alert("Check-In Complete!");
        });
    };
    
    $scope.showMealIndexView = function() {
        $scope.showActionIndex = false;
        $scope.showMealIndex = true;
    };
    
    $scope.markMeal = function(mealName) {
        var data = $scope.data;
        
        data['ate_' + mealName] = true;
        
        $scope.registrant.$save(data)
        .then(function() {
            // Nothing
        });
    };
    
    $scope.backToActions = function() {
        $scope.showActionIndex = true;
        $scope.showWorkshopIndex = false;
        $scope.showMealIndex = false;
    };
    
    $scope.showWorkshopIndexView = function() {
        $scope.showActionIndex = false;
        $scope.showMealIndex = false;
        $scope.showWorkshopIndex = true;
    };
    
    $scope.checkInWorkshop = function(index) {
        var workshop = $scope.workshops[index];
        var registrant = $scope.registrant[0];
        
        var attendance = workshop.attendance;
        var workshops_attended = registrant.workshops_attended;
        
        // Add the registrant's attendance to the workshop storage
        var name = registrant.first_name + " " + registrant.last_name;
        if (attendance == undefined) 
            attendance = [name];
        else
            attendance.push(name);
        workshop.attendance = attendance;
        
        // Add the workshop name to the registrants storage
        if (workshops_attended == undefined)
            workshops_attended = [workshop.workshop_name];
        else
            workshops_attended.push(workshop.workshop_name);
        registrant.workshops_attended = workshops_attended;
        
        $scope.registrant.$save(registrant);
        $scope.workshops.$save(workshop)
        .then(function() {
            alert("Attendance confirmed!");
        });
    };
    
    $scope.giveShirt = function() {
        var data = $scope.data;
        
        data.got_shirt = true;
        
        $scope.registrant.$save(data)
        .then(function() {
            // Nothing 
        });
    };
    
    $scope.claimOwnership = function() {
        var phoneNumberGuess = prompt("If this is you, what's your phone number?");
                    
        if (phoneNumberGuess.toString() == $scope.data.phone_number) 
            $scope.authenticated = true;
    };
    
    $scope.updatePrivacySettings = function() {
        var data = $scope.data;
        data.show_email = $scope.checkboxModel.show_email;
        data.show_school = $scope.checkboxModel.show_school;
        
        $scope.registrant.$save(data)
        .then(function() {
            alert("Privacy settings saved!");
        });
        
        $scope.data = $scope.registrant[0];
        
        if ($scope.data.show_email) 
            $scope.email = $scope.data.email;
        if ($scope.data.show_school)
            $scope.school = $scope.data.school;
    };
});

app.controller("EnrollmentCtrl", function($scope, $window, $firebaseArray) {
    $scope.enrollment_success = false;
    
    var password = prompt("What is the password?");
    
    // If nothing is entered, show nothing
    if (password == undefined) {
        $scope.enrollment_success = false;
        return;
    }
    
    // the hash of HackUMBCF2019!
    if (hashCode(password) == -354336881) {
        // Create device fingerprint
        new Fingerprint2().get(function(result, components) {
            var ref = firebase.database().ref().child("enrolled_devices");
            $scope.enrolled_devices = $firebaseArray(ref);
            
            // Add fingerprint to the database
            $scope.enrolled_devices.$add({
                "fingerprint": result
            })
            .then(function() {
                $scope.enrollment_success = true;
            });
        });
    }
});

app.controller("WorkshopManagerCtrl", function($scope, $window, $firebaseArray) {
    $scope.workshops = $firebaseArray(firebase.database().ref().child("workshops"));
    
    $scope.enrolled_devices = $firebaseArray(firebase.database().ref().child("enrolled_devices"));
    
    $scope.enrolled_devices.$loaded(function() {
        new Fingerprint2().get(function(result, components) {
            var deviceFingerprint = result;
                    
            for (var i = 0; i < $scope.enrolled_devices.length; i++) {
                var enrolledDeviceFingerprint = $scope.enrolled_devices[i].fingerprint;
                
                if (deviceFingerprint == enrolledDeviceFingerprint) {
                    $scope.$apply(function() {
                         $scope.enrolled = true;
                    });
                    
                    break;
                }
            }
        });
    });
});

app.controller("AdminCtrl", function($scope, $window, $firebaseArray) { 
    $scope.workshops = $firebaseArray(firebase.database().ref().child("workshops"));
    
    $scope.enrolled_devices = $firebaseArray(firebase.database().ref().child("enrolled_devices"));
    
    $scope.index = -1;
    
    $scope.enrolled_devices.$loaded(function() {
        new Fingerprint2().get(function(result, components) {
            var deviceFingerprint = result;
                    
            for (var i = 0; i < $scope.enrolled_devices.length; i++) {
                var enrolledDeviceFingerprint = $scope.enrolled_devices[i].fingerprint;
                
                if (deviceFingerprint == enrolledDeviceFingerprint) {
                    $scope.$apply(function() {
                         $scope.enrolled = true;
                    });
                    
                    break;
                }
            }
        });
    });
    
    $scope.editWorkshop = function(index) {
        var data = $scope.workshops[index];
        
        $scope.index = index;
        
        $scope.workshop_name = data.workshop_name;
        $scope.workshop_location = data.workshop_location;
        $scope.workshop_time = data.workshop_time;
    };
    
    $scope.deleteWorkshop = function(index) {
        var data = $scope.workshops[index];
        
        $scope.workshops.$remove(data)
        .then(function() {
            alert("Workshop deleted."); 
        });
    };
    
    $scope.clearForm = function() {
        $scope.index = -1;
        
        $scope.workshop_name = "";
        $scope.workshop_location = "";
        $scope.workshop_time = "";
    };
    
    $scope.createWorkshop = function() {
        if ($scope.index == -1) {
            $scope.workshops.$add({
                "workshop_name": $scope.workshop_name,
                "workshop_time": $scope.workshop_time,
                "workshop_location": $scope.workshop_location
            })
            .then(function() {
                alert($scope.workshop_name + " was successfully added!");
            });
        }
        else {
            var data = $scope.workshops[$scope.index];
            data.workshop_name = $scope.workshop_name;
            data.workshop_time = $scope.workshop_time;
            data.workshop_location = $scope.workshop_location;
            
            $scope.workshops.$save(data)
            .then(function() {
               alert($scope.workshop_name + " was successfully edited!");
            });
        }
    };
});