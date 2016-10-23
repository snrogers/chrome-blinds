console.log('checking if blocked');
chrome.runtime.sendMessage({ category: 'checkIfBlocked', data: { url: document.URL } }, function (response) {
    console.log('== response ==');
    console.log(response);
    console.log('==============');
    if (response.isSuccessful) {
        if (response.data.isBlocked) {
            console.log('blocking');
            document.body.innerHTML =
                Blinds.HtmlBlock +
                    document.body.innerHTML;
            document.getElementById('blockImage').addEventListener('load', function () {
                document.getElementById("blockImage").style.transform = "translateY(0%)";
            });
        }
        else {
            console.log('not blocking');
        }
    }
    else {
        console.log('ERROR IN checkIfBlocked');
        console.log(response);
    }
});

//# sourceMappingURL=content.js.map
