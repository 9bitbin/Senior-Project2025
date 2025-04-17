document.getElementById('notifyBtn').addEventListener('click'); {
    if("notification"in window) {
        Notification.requestPermission().then(Permissions); {
            if(Permissions === 'granted'){
                new Notification('Button Clicked');{
                    body: ""; // don't forget to add something 
                    icon:""; // needs an icon

                }

            }
            
        }

    }

}