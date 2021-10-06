if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(registration =>{
        console.log("sw registered");
    }).catch(err =>{
        console.log("error");
    })
    
}