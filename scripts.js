scripts = {
    getUrl: `document.URL`,
    getTotalVideos: `document.evaluate("\/\/*[@id='publisher-container']/div/yt-formatted-string/span[3]", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue.textContent;`,
}

export {scripts};