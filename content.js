
// helper functions 

function addToStorage(setObj){

    return new Promise((resolve, reject) => {
        try {
            chrome.storage.local.set(setObj, function(){
                // console.log("object is saved!")
                // console.log(JSON.stringify(setObj));
                resolve(true);
            });
        }
        catch (err) {
            console.log(err);
            reject(err);
        }
    });
}

function getFromStorage(key) {
    p =  new Promise((resolve, reject) => {
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
    return p;
}


function getTotalVideos(){
    return document.evaluate("\/\/*[@id='publisher-container']/div/yt-formatted-string/span[3]", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue.textContent;
}


function getCurrentVideo() {
    d = document.evaluate('\/\/*[@id="publisher-container"]/div/yt-formatted-string/span[1]', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null)
    value = d.singleNodeValue
    if(value){
        return value.textContent;
    }
    // trying method 2
    url = document.createElement.URL;
    data = getUrlData(url);
    return data['index'];
}


function getName() {
    d =  document.evaluate('\/\/*[@id="header-description"]/h3/yt-formatted-string/a', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null)
    return d.singleNodeValue.textContent;
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



// main functions

async function trackPlaylist(){
    

    const url = document.URL;
    let playlistId = getUrlData(url)['list']
    const playlistUrl = `https://www.youtube.com/playlist?list=${playlistId}`;

    currentVideo = getCurrentVideo();
    if(!currentVideo) {
        console.log("not a running playlist!");
        return;
    }
    currentVideo = parseInt(currentVideo, 10);
    youtodoList = await getFromStorage('youtodoList');
    youtodoList = youtodoList['youtodoList'];
    if(youtodoList) {
        let isModified = false;
        let is_found = false;

        for(let i = 0; i < youtodoList.length; i++) {
            if(youtodoList[i].url == playlistUrl) {

                let currentProgress = youtodoList[i].progress;
                if(currentProgress < currentVideo){
                    youtodoList[i].progress = currentVideo;
                    isModified = true;
                }
                is_found = true;
                break;
            }
        }

        if(isModified) {
            addToStorage({"youtodoList": youtodoList});
            console.log("progress is modified");
        }

    }
    // console.log(`current progress ${currentVideo} / ${totalVideos[url].total}`);
}

async function removePlaylist(event) {
    element = event.target.parentElement;
    playlistUrl = element.children[0].href;
    youtodoList = await getFromStorage('youtodoList');
    youtodoList = youtodoList['youtodoList']
    newList = []
    // using loops since filter was not working
    for(let i = 0; i < youtodoList.length; i++) {
        if(youtodoList[i].url == playlistUrl){
            continue;
        }
        // console.log(youtodoList[i]);
        newList.push(youtodoList[i])
    }
    // console.log(newList);
    await addToStorage({"youtodoList": newList});
    showPendingPlaylists();
}


// main function to show playlists
function injectToPage(listOfPlaylists) {

    if(listOfPlaylists.length == 0) return;

    const divContainer = document.querySelector("#primary")
    let divToAdd =  document.querySelector('#youtodoListView')
    if(!divToAdd) {
        divToAdd = document.createElement('div');
        divToAdd.setAttribute('id', 'youtodoListView');
    }

    // removing past elements - lol 
    divToAdd.innerHTML = ''
    var node = document.createElement('ol')
    let title = document.createElement("p")
    title.innerHTML = "You have pending playlists to complete";
    title.setAttribute("style", "margin-bottom: 20px;");
    divToAdd.appendChild(title);

    function createListElement(object, index) {
        var node = document.createElement('li');
        node.setAttribute('id', `youtodo_list_element_${index}`)
        node.innerHTML = `
            <a href=${object.url} target="_blank" class="youtodo_list_element_left">${object.playlistName}</a>
            <span class="youtodo_list_progress">${object.progress}</span>
        `
        button = document.createElement('button')
        button.setAttribute('class', 'youtodo_list_delete_button')
        button.innerText = "remove"
        button.addEventListener('click', removePlaylist);
        node.append(button)
        node.setAttribute("class", "youtodo_list_element");

        return node;
    }

    for(let i = 0; i < listOfPlaylists.length; i++) {
        obj = listOfPlaylists[i]
        element = createListElement(obj, i + 1);
        node.append(element);
    }

    divToAdd.setAttribute("style", "padding: 100px; font-size: 20px; hieght: 50px")
    divToAdd.append(node);
    divContainer.prepend(divToAdd);

}

async function showPendingPlaylists() {
    let youtodoList = await getFromStorage('youtodoList');
    console.log(youtodoList);
    if(Object.keys(youtodoList).length == 0) {
        console.log("no playlists in store!");
        return;
    }
    youtodoList = youtodoList['youtodoList']

    let listOfPlaylists = []
    for(i = 0; i < youtodoList.length; i++) {
        obj = {
            playlistName: youtodoList[i].playlistName,
            url: youtodoList[i].url,
            progress: `${youtodoList[i].progress} / ${youtodoList[i].totalVideos}`
        }
        listOfPlaylists.push(obj);
    }

    injectToPage(listOfPlaylists);
    
    // chrome.storage.local.remove("youtodoList", function(){ console.log("youtodo-list cleared!")});

}

// assigning events

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if(request.message=="startTracking"){
        trackPlaylist();
    }
    sendResponse({message: "started tracking"});
});

window.onload = function(){

if(document.URL == "https://www.youtube.com/") {
    showPendingPlaylists();
}
else {
    // addPlaylist();
    setInterval(trackPlaylist, 7000);
    // trackPlaylist();
}
}

window.onpopstate = function(){
    console.log("the URl has changed!");
}
window.onpushstate = function() {
    console.log("the url has changed");
}