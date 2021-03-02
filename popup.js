// Change the periodInMinutes property to set time interval

// function getCurrentTab = () => {
//     var current_tab;

//     chrome.tabs.query({'active': true, 'lastFocusedWindow': true, 'currentWindow': true}, function (tabs) {
//         current_tab = tabs[0]; 
//     });

//     return current_tab;
// };

// function addCurrentPlaylist = () => {
//     const current_tab = getCurrentTab();
//     if(!(current_tab.url.contains("youtube.com") && current_tab.url.contains("list="))){
//         // TODO: do something interesting here
//         console.log("not the page i work for");
//         return;
//     }




// };

// import {scripts} from "./scripts.js"
scripts = {
    getUrl: `document.URL`,
    getTotalVideos: `document.evaluate("\/\/*[@id='publisher-container']/div/yt-formatted-string/span[3]", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue.textContent;`,
    getTotalVideos2: `document.evaluate("\/\/*[@id="stats"]/yt-formatted-string[1]/span[1]", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue.textContent;`,
    getName: `document.evaluate('\/\/*[@id="header-description"]/h3/yt-formatted-string/a', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue.textContent;`

}


async function getcurrentTab() {
    return new Promise((resolve, reject)=> {
        try {
            chrome.tabs.query({active: true, lastFocusedWindow: true}, (tabs) => {
                let tab = tabs[0];
                resolve(tab);
                // use `url` here inside the callback because it's asynchronous!
            });
        }
        catch (err) {
            console.log(err);
            reject(err);
        }
    });
}

function addToStorage(object) {
    chrome.storage.local.set(object, function() {
        console.log('saving object');
        console.log(JSON.stringify(object));
    });
}

async function getFromStorage(key) {
    return new Promise((resolve, reject) => {
        try {
            chrome.storage.local.get([key], function (value) {
                // console.log(JSON.stringify(value));
                resolve(value);
            })
        }
        catch (ex) {
            reject(ex);
        }
    });
}

async function scriptExecutor(tabID, script) {
    return new Promise((resolve, reject)=>{
        try {
            chrome.tabs.executeScript(tabID, {code: script}, function (result) {
                resolve(result);
            })
        }
        catch (err) {
            console.log(err);
            reject(err);
        }
    });
}

function getUrlData(url) {
    query_string = url.split('?')[1];
    query_list = query_string.split('&')
    obj = {}
    for(i = 0; i < query_list.length; i++) {

        pair = query_list[i].split("=");
        obj[pair[0]] = pair[1];
    }

    return obj;
}

async function executor() {
    /*
        what to do here? here i want to call a bunch of execution scripts
        following is the pipeline
        get the values from the DOM page,
        save it to DB
        for now just add progress as 0 to when user wtches it will automatically be set. 

    */
    let currentTab = await getcurrentTab();
    let currentUrl = currentTab.url;
    console.log(currentUrl);
    if(currentUrl.search("youtube.com") == -1 || currentUrl.search('list=') == -1) {
        console.log(currentUrl);
        console.log("this is not the page we want!");
        document.querySelector('#status').innerHTML = "invalid!"
        return;
    }


    let totalVideos = await scriptExecutor(currentTab.id, scripts.getTotalVideos);
    if(!totalVideos) {
        totalVideos = await scriptExecutor(currentTab.id, scripts.gettotalVideos2)
    }
    totalVideos = totalVideos[0]; 
    console.log(totalVideos)
    let urlData  = getUrlData(currentUrl);
    let setObj = {}
    let playlistUrl = `https://www.youtube.com/playlist?list=${urlData['list']}`

    setObj[playlistUrl] = {
        totalVideos: parseInt(totalVideos, 10),
        latestUrl: currentUrl,
        progress: 0
    }

    let youtodoList = await getFromStorage('youtodoList');
    let playlists = youtodoList["youtodoList"];
    console.log(playlists);
    if (playlists && playlists.find(o => o.url == playlistUrl)) {
        document.querySelector('#status').innerHTML = "already present!";
        console.log("this playlist is already present");
        return;
    }
    else{
        const playlistName = await scriptExecutor(currentTab.id, scripts.getName);
        console.log(playlistName);
        obj = {
            playlistName: playlistName[0],
            totalVideos: parseInt(totalVideos, 10),
            progress: 0,
            url: playlistUrl,
            latestUrl: currentUrl
        }
        if(!playlists) {
            playlists = [];
        }
        playlists.unshift(obj);
        await addToStorage({"youtodoList": playlists});
    }

    // let x = await addToStorage(setObj);
    document.querySelector('#status').innerHTML = "success!";

}

function addPlaylist(){
    
    // make async call to executor and he will handle everythin asyncronously 
    console.log("this is triggered");
    executor();
}

document.querySelector('#add-playlist').onclick = addPlaylist;