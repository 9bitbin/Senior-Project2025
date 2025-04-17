if("notification" in window){
    Notification.requestPermission().then(Permissions) 
        if(Permissions ==='granted'){
            let notification = new notification ('New Message')
            icon: "" // add a picture
        }

        notification.onclick = function() {

            window.open(''); // add a website
        }
    

}