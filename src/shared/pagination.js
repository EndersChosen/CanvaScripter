// uses the 'link' header response to find
// the 'next' page of api respones
function getNextPage(links) {


    const arrayLinks = links.split(',');
    const json = arrayLinks.map(element => {
        const [link, rel] = element.split(';');
        return {
            link: link.trim().replace(/[<>]/g, ''),
            rel: rel.split('=')[1].trim().replace(/\"/g, '')
        };
    });
    //console.log(json);
    for (let obj of json) {
        if (obj.rel === 'next') {
            console.log('Getting next page');
            return obj.link;
        }
    }
    return false;
}

module.exports = { getNextPage };
